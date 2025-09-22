import base64
import datetime as dt
import re
from decimal import Decimal, ROUND_HALF_UP
from types import SimpleNamespace

from flask import Flask, abort, flash, redirect, render_template, request, url_for
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy.exc import IntegrityError

try:
    from barcode import Code128
    from barcode.writer import SVGWriter
except ImportError as exc:  # pragma: no cover - dependency helper
    raise SystemExit(
        "Falta la dependencia 'python-barcode'. Instale los requisitos del proyecto."
    ) from exc

app = Flask(__name__)
app.config.update(
    SECRET_KEY="gestor-boletas",
    SQLALCHEMY_DATABASE_URI="sqlite:///gestor_boletas.db",
    SQLALCHEMY_TRACK_MODIFICATIONS=False,
)

db = SQLAlchemy(app)


@app.context_processor
def inyectar_utilidades():
    return {"dt": dt, "hoy": dt.date.today()}


class Contribuyente(db.Model):
    __tablename__ = "contribuyentes"

    id = db.Column(db.Integer, primary_key=True)
    numero_contribuyente = db.Column(db.String(32), unique=True, nullable=False)
    nombre = db.Column(db.String(120), nullable=False)
    apellido = db.Column(db.String(120), nullable=False)
    direccion = db.Column(db.String(200), nullable=False)
    metros_lineales = db.Column(db.Numeric(10, 2), default=0)
    samco = db.Column(db.Numeric(10, 2), default=0)
    descuento_jubilado = db.Column(db.Numeric(10, 2), default=0)
    recoleccion_residuos = db.Column(db.Numeric(10, 2), default=0)
    alumbrado_publico = db.Column(db.Numeric(10, 2), default=0)
    corte_pasto = db.Column(db.Numeric(10, 2), default=0)
    fecha_vencimiento = db.Column(db.Date, nullable=False)
    pagado = db.Column(db.Boolean, default=False)
    fecha_pago = db.Column(db.Date, nullable=True)

    @property
    def total(self) -> Decimal:
        cargos = [
            self.metros_lineales or Decimal("0"),
            self.samco or Decimal("0"),
            self.recoleccion_residuos or Decimal("0"),
            self.alumbrado_publico or Decimal("0"),
            self.corte_pasto or Decimal("0"),
        ]
        descuento = self.descuento_jubilado or Decimal("0")
        total = sum(cargos, Decimal("0")) - descuento
        return total if total > 0 else Decimal("0")

    @property
    def barcode_value(self) -> str:
        numero = re.sub(r"\D", "", self.numero_contribuyente)
        numero = numero.zfill(8)
        vencimiento = self.fecha_vencimiento.strftime("%Y%m%d") if self.fecha_vencimiento else "00000000"
        total_centavos = int((self.total * 100).quantize(Decimal("1"), rounding=ROUND_HALF_UP))
        return f"{numero}{vencimiento}{total_centavos:010d}"

    @property
    def barcode_svg_base64(self) -> str:
        codigo = generar_codigo_barras(self.barcode_value)
        return base64.b64encode(codigo).decode("utf-8")


def generar_codigo_barras(valor: str) -> bytes:
    """Devuelve el SVG en bytes del código de barras para el valor dado."""
    codigo = Code128(valor, writer=SVGWriter())
    svg_bytes = codigo.render(writer_options={"module_height": 20.0, "font_size": 10, "text_distance": 1})
    return svg_bytes


@app.template_filter("moneda")
def formato_moneda(valor):
    if valor is None:
        return "-"
    if not isinstance(valor, Decimal):
        valor = Decimal(valor)
    cuantizado = valor.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    texto = f"{cuantizado:,.2f}"
    return f"$ {texto.replace(',', 'X').replace('.', ',').replace('X', '.')}"


@app.template_filter("como_input")
def formato_para_input(valor):
    if valor is None:
        return ""
    if isinstance(valor, dt.date):
        return valor.isoformat()
    if isinstance(valor, Decimal):
        cuantizado = valor.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
        return format(cuantizado, "f")
    return str(valor)


def parse_decimal(nombre_campo: str) -> Decimal:
    dato = request.form.get(nombre_campo, "").strip()
    if not dato:
        return Decimal("0")
    dato = dato.replace(".", "").replace(",", ".")
    try:
        return Decimal(dato)
    except Exception:  # pragma: no cover - validación básica
        raise ValueError(f"Valor numérico inválido en el campo '{nombre_campo}'.")


def datos_desde_formulario(form) -> SimpleNamespace:
    return SimpleNamespace(
        numero_contribuyente=form.get("numero_contribuyente", ""),
        nombre=form.get("nombre", ""),
        apellido=form.get("apellido", ""),
        direccion=form.get("direccion", ""),
        metros_lineales=form.get("metros_lineales", ""),
        samco=form.get("samco", ""),
        descuento_jubilado=form.get("descuento_jubilado", ""),
        recoleccion_residuos=form.get("recoleccion_residuos", ""),
        alumbrado_publico=form.get("alumbrado_publico", ""),
        corte_pasto=form.get("corte_pasto", ""),
        fecha_vencimiento=form.get("fecha_vencimiento", ""),
        fecha_pago=form.get("fecha_pago", ""),
    )


@app.route("/")
def dashboard():
    contribuyentes = Contribuyente.query.order_by(Contribuyente.numero_contribuyente).all()
    total_pagado = sum((c.total for c in contribuyentes if c.pagado), Decimal("0"))
    total_deuda = sum((c.total for c in contribuyentes if not c.pagado), Decimal("0"))
    return render_template(
        "dashboard.html",
        contribuyentes=contribuyentes,
        total_pagado=total_pagado,
        total_deuda=total_deuda,
    )


@app.route("/contribuyentes/nuevo", methods=["GET", "POST"])
def nuevo_contribuyente():
    if request.method == "POST":
        try:
            contribuyente = Contribuyente(
                numero_contribuyente=request.form["numero_contribuyente"].strip(),
                nombre=request.form["nombre"].strip(),
                apellido=request.form["apellido"].strip(),
                direccion=request.form["direccion"].strip(),
                metros_lineales=parse_decimal("metros_lineales"),
                samco=parse_decimal("samco"),
                descuento_jubilado=parse_decimal("descuento_jubilado"),
                recoleccion_residuos=parse_decimal("recoleccion_residuos"),
                alumbrado_publico=parse_decimal("alumbrado_publico"),
                corte_pasto=parse_decimal("corte_pasto"),
                fecha_vencimiento=dt.date.fromisoformat(request.form["fecha_vencimiento"]),
            )
        except Exception as exc:
            flash(str(exc), "danger")
            return render_template(
                "form_contribuyente.html",
                contribuyente=datos_desde_formulario(request.form),
                modo="Nuevo",
            )

        db.session.add(contribuyente)
        try:
            db.session.commit()
        except IntegrityError:
            db.session.rollback()
            flash("Ya existe un contribuyente con ese número.", "danger")
            return render_template(
                "form_contribuyente.html",
                contribuyente=datos_desde_formulario(request.form),
                modo="Nuevo",
            )
        flash("Contribuyente creado correctamente.", "success")
        return redirect(url_for("dashboard"))

    return render_template("form_contribuyente.html", contribuyente=None, modo="Nuevo")


@app.route("/contribuyentes/<int:contribuyente_id>/editar", methods=["GET", "POST"])
def editar_contribuyente(contribuyente_id):
    contribuyente = Contribuyente.query.get_or_404(contribuyente_id)
    if request.method == "POST":
        try:
            contribuyente.numero_contribuyente = request.form["numero_contribuyente"].strip()
            contribuyente.nombre = request.form["nombre"].strip()
            contribuyente.apellido = request.form["apellido"].strip()
            contribuyente.direccion = request.form["direccion"].strip()
            contribuyente.metros_lineales = parse_decimal("metros_lineales")
            contribuyente.samco = parse_decimal("samco")
            contribuyente.descuento_jubilado = parse_decimal("descuento_jubilado")
            contribuyente.recoleccion_residuos = parse_decimal("recoleccion_residuos")
            contribuyente.alumbrado_publico = parse_decimal("alumbrado_publico")
            contribuyente.corte_pasto = parse_decimal("corte_pasto")
            contribuyente.fecha_vencimiento = dt.date.fromisoformat(request.form["fecha_vencimiento"])
            if request.form.get("fecha_pago"):
                contribuyente.fecha_pago = dt.date.fromisoformat(request.form["fecha_pago"])
                contribuyente.pagado = True
            else:
                contribuyente.fecha_pago = None
                contribuyente.pagado = False
        except Exception as exc:
            flash(str(exc), "danger")
            return render_template(
                "form_contribuyente.html",
                contribuyente=datos_desde_formulario(request.form),
                modo="Editar",
            )

        try:
            db.session.commit()
        except IntegrityError:
            db.session.rollback()
            flash("Ya existe un contribuyente con ese número.", "danger")
            return render_template(
                "form_contribuyente.html",
                contribuyente=contribuyente,
                modo="Editar",
            )
        flash("Contribuyente actualizado correctamente.", "success")
        return redirect(url_for("dashboard"))

    return render_template("form_contribuyente.html", contribuyente=contribuyente, modo="Editar")


@app.route("/contribuyentes/<int:contribuyente_id>/eliminar", methods=["POST"])
def eliminar_contribuyente(contribuyente_id):
    contribuyente = Contribuyente.query.get_or_404(contribuyente_id)
    db.session.delete(contribuyente)
    db.session.commit()
    flash("Contribuyente eliminado.", "info")
    return redirect(url_for("dashboard"))


@app.route("/contribuyentes/<int:contribuyente_id>/pago", methods=["POST"])
def actualizar_pago(contribuyente_id):
    contribuyente = Contribuyente.query.get_or_404(contribuyente_id)
    pagado = request.form.get("pagado") == "on"
    fecha_pago_raw = request.form.get("fecha_pago", "").strip()

    contribuyente.pagado = pagado
    if fecha_pago_raw:
        try:
            contribuyente.fecha_pago = dt.date.fromisoformat(fecha_pago_raw)
        except ValueError:
            flash("Fecha de pago inválida.", "danger")
            return redirect(url_for("dashboard"))
    else:
        contribuyente.fecha_pago = None

    db.session.commit()
    flash("Estado de pago actualizado.", "success")
    return redirect(url_for("dashboard"))


@app.route("/boletas/<int:contribuyente_id>")
def boleta_individual(contribuyente_id):
    contribuyente = Contribuyente.query.get_or_404(contribuyente_id)
    return render_template("print_boletas.html", contribuyentes=[contribuyente])


@app.route("/boletas")
def boletas_todas():
    contribuyentes = Contribuyente.query.order_by(Contribuyente.numero_contribuyente).all()
    if not contribuyentes:
        abort(404)
    return render_template("print_boletas.html", contribuyentes=contribuyentes)


@app.errorhandler(404)
def pagina_no_encontrada(_error):  # pragma: no cover - manejo básico
    return render_template("404.html"), 404


def inicializar_db():
    with app.app_context():
        db.create_all()


def main():
    inicializar_db()
    app.run(debug=True)


if __name__ == "__main__":
    main()
