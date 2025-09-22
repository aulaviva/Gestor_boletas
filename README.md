# Gestor de boletas para Tasa de Servicios Públicos

Aplicación web para administrar contribuyentes de la **COMUNA DE LAS PETACAS**, generar boletas con código de barras y llevar control de pagos de la tasa de servicios públicos.

## Funcionalidades principales

- Alta, edición y eliminación de contribuyentes.
- Panel con resumen de totales cobrados y deudores, más el detalle de cada servicio facturado.
- Control de pagos con fecha de cobro.
- Generación de boletas individuales o de toda la nómina en formato listo para impresión (tres boletas por hoja A4, divididas en talón para el contribuyente y talón para el banco).
- Inclusión automática de código de barras escaneable y fecha de vencimiento en cada boleta.

## Requisitos

- Python 3.11+
- Dependencias listadas en `requirements.txt`

## Instalación

1. Crear un entorno virtual (opcional pero recomendado):

   ```bash
   python -m venv .venv
   source .venv/bin/activate  # En Windows: .venv\\Scripts\\activate
   ```

2. Instalar las dependencias:

   ```bash
   pip install -r requirements.txt
   ```

3. Inicializar la base de datos SQLite (se crea automáticamente al iniciar la aplicación).

## Uso

1. Iniciar la aplicación:

   ```bash
   python app.py
   ```

2. Acceder desde el navegador a `http://127.0.0.1:5000/`.

3. Desde el panel principal se puede:
   - Agregar contribuyentes y registrar los importes correspondientes a metros lineales, S.A.M.Co., recolección de residuos, alumbrado público y corte de pasto.
   - Registrar descuentos para jubilados.
   - Visualizar totales cobrados y deudas.
   - Registrar pagos con su fecha correspondiente.
   - Imprimir una boleta individual o todas las boletas en conjunto.

Los datos se almacenan en el archivo `gestor_boletas.db` dentro del proyecto.

## Estructura de impresión

- Tres boletas por hoja A4 (orientación vertical).
- Cada boleta contiene encabezado con la leyenda **COMUNA DE LAS PETACAS** y detalle de servicios.
- División clara entre talón del contribuyente y talón del banco.
- Código de barras generado automáticamente a partir del número de contribuyente, fecha de vencimiento e importe total.

## Notas

- Los importes se almacenan y muestran con dos decimales.
- Si se registra la fecha de pago, el contribuyente se marca automáticamente como cobrado.
- Para reiniciar el sistema desde cero, eliminar el archivo `gestor_boletas.db`.
