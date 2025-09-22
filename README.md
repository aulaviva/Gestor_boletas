# Gestor de boletas de tasas de servicio público

Aplicación web estática para administrar contribuyentes, registrar pagos manuales y generar boletas mensuales de tasas de servicio público con código de barras listo para impresión.

## Características principales

- Dashboard para alta, edición y baja de contribuyentes.
- Cálculo automático de la tasa según metros de frente, aporte al S.A.M.Co. y hasta dos servicios adicionales.
- Campo de descuento para jubilados aplicado al subtotal.
- Generación de boletas divididas en dos cuerpos (contribuyente y banco) con código de barras en formato Code 39.
- Registro de pagos manuales y listado histórico asociado a cada contribuyente.
- Almacenamiento local mediante `localStorage`, sin necesidad de servidor ni base de datos externa.

## Requisitos

No se requieren dependencias adicionales. La aplicación funciona en cualquier navegador moderno con soporte para JavaScript.

## Cómo utilizar

1. Abra el archivo `index.html` en un navegador web.
2. Cargue los contribuyentes desde el formulario principal, completando los metros de frente, importes y servicios adicionales.
3. Registre pagos manuales cuando corresponda.
4. Seleccione un contribuyente y complete el período en la sección "Generador de boletas mensuales" para visualizar la boleta.
5. Utilice el botón "Imprimir boleta actual" para obtener la boleta en papel o PDF.
6. El botón "Reiniciar base local" elimina la información almacenada en el navegador (contribuyentes y pagos).

> **Nota:** Los datos se guardan únicamente en el almacenamiento local del navegador. Si necesita conservarlos en otro equipo realice una exportación manual (por ejemplo copiando el contenido de `localStorage`).
