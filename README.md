# Gestor de boletas para Tasa de Servicios Públicos

Aplicación para administrar contribuyentes de la **COMUNA DE LAS PETACAS**, generar boletas con código de barras y llevar control de pagos de la tasa de servicios públicos.

> ✅ Ahora el proyecto incluye un archivo HTML autónomo listo para descargar y ejecutar sin instalar dependencias.

## Descarga rápida del archivo HTML

1. Dentro de este repositorio abra `gestor_boletas.html` y use la opción **Guardar como...** de su navegador para descargarlo.
2. También puede copiar y pegar el contenido completo del archivo en un editor de texto y guardarlo con la extensión `.html`.
3. Una vez descargado, haga doble clic sobre el archivo para abrirlo en el navegador y comenzar a usar el gestor sin instalaciones adicionales.


## Funcionalidades principales

- Alta, edición y eliminación de contribuyentes.
- Panel con resumen de totales cobrados y deudores, más el detalle de cada servicio facturado.
- Control de pagos con fecha de cobro.
- Generación de boletas individuales o de toda la nómina en formato listo para impresión (tres boletas por hoja A4, divididas en talón para el contribuyente y talón para el banco).
- Inclusión automática de código de barras escaneable y fecha de vencimiento en cada boleta.
- Exportación e importación de la base de datos en formato JSON.

## Uso inmediato (HTML listo para ejecutar)

1. Descargue o copie el archivo `gestor_boletas.html`.
2. Ábralo directamente en su navegador favorito (Chrome, Edge, Firefox, etc.).
3. Toda la información se guarda automáticamente en el almacenamiento local del navegador, por lo que puede cerrar y volver a abrir el archivo sin perder los datos.
4. Desde la interfaz podrá:
   - Cargar, editar o eliminar contribuyentes.
   - Registrar importes por metros lineales, S.A.M.Co., recolección de residuos, alumbrado público y corte de pasto.
   - Aplicar descuentos para jubilados.
   - Controlar pagos y ver la fecha de cobro.
   - Imprimir boletas individuales, las seleccionadas o toda la nómina (3 por hoja A4 con talón para contribuyente y banco).
   - Exportar la base a un archivo JSON o importar una base previamente exportada.

> Nota: si desea empezar con la base vacía, utilice el botón de exportación para generar un respaldo y borre los datos desde el navegador (en el apartado de almacenamiento local).

## Uso con backend Flask (opcional)

Si prefiere una solución con base de datos SQLite y servidor web, conserve el flujo original incluido en este repositorio.

### Requisitos

- Python 3.11+
- Dependencias listadas en `requirements.txt`

### Instalación

1. Crear un entorno virtual (opcional pero recomendado):

   ```bash
   python -m venv .venv
   source .venv/bin/activate  # En Windows: .venv\Scripts\activate
   ```

2. Instalar las dependencias:

   ```bash
   pip install -r requirements.txt
   ```

3. Inicializar la base de datos SQLite (se crea automáticamente al iniciar la aplicación).

### Uso

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
- Para reiniciar el sistema desde cero en la versión Flask, eliminar el archivo `gestor_boletas.db`.
