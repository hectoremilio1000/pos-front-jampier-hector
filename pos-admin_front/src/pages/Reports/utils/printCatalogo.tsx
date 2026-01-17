// src/utils/printCatalogos.ts

// Imprime sin abrir pestaña
function printViaIframe(html: string) {
  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (doc) {
    doc.open();
    doc.write(html);
    doc.close();
  }

  setTimeout(() => {
    (iframe.contentWindow as any)?.print();
    setTimeout(() => document.body.removeChild(iframe), 600);
  }, 300);
}

interface Restaurant {
  id: number;
  name: string;
  address?: string | null;
}

export function printCatalogoProductos({
  rows,
  restaurant,
}: {
  rows: any[];
  restaurant: Restaurant | null | undefined;
}) {
  if (!rows.length) return;

  const today = new Date();
  const f = today.toLocaleDateString("es-MX");
  const h = today.toLocaleTimeString("es-MX");

  // Agrupar por grupo
  const groups = rows.reduce((acc: any, item: any) => {
    const g = item.group?.name ?? "SIN GRUPO";
    if (!acc[g]) acc[g] = [];
    acc[g].push(item);
    return acc;
  }, {});

  const restaurantName = restaurant?.name ?? "MI RESTAURANTE";
  const restaurantAddress = restaurant?.address ?? "";
  const restaurantRFC = "RFC PENDIENTE"; // si lo tienes en user.restaurant agrega el campo

  let html = `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<title>Catálogo de Productos</title>
<style>
  body {
    font-family: Arial, sans-serif;
    font-size: 11px;
    margin: 20px;
  }
  .header { font-size: 12px; margin-bottom: 10px; }
  .title { font-size: 14px; font-weight: bold; margin-top: 10px; }
  table { width: 100%; border-collapse: collapse; margin-top: 6px; }
  th { background: #ccc; padding: 4px; border: 1px solid #555; font-weight: bold; }
  td { padding: 4px; border-bottom: 1px solid #ddd; }
  .group-title {
    background: #bbb;
    padding: 6px;
    margin-top: 14px;
    font-size: 13px;
    font-weight: bold;
  }
  .footer {
    margin-top: 4px;
    font-size: 11px;
    font-style: italic;
  }
</style>
</head>
<body>

<div class="header">
  <div><b>${restaurantName}</b></div>
  <div>${restaurantAddress}</div>
  <div>${restaurantRFC}</div>
</div>

<div style="text-align:right;font-size:11px;">
  ${f} <br/>
  ${h}
</div>

<div class="title">CATÁLOGO DE PRODUCTOS (ORDENADO POR CLAVE)</div>
`;

  // Para cada grupo generar tabla
  Object.keys(groups).forEach((groupName, index) => {
    const items = groups[groupName];

    html += `
    <div class="group-title">
      GRUPO DE PRODUCTOS: (${index + 1}) ${groupName}
    </div>

    <table>
      <thead>
        <tr>
          <th>CLAVE</th>
          <th>PLU</th>
          <th>DESCRIPCIÓN</th>
          <th>PRECIO (SIN IMP)</th>
          <th>IMP %</th>
          <th>IMPUESTO</th>
          <th>PRECIO</th>
          <th>COMEDOR</th>
          <th>DOMICILIO</th>
          <th>RÁPIDO</th>
        </tr>
      </thead>
      <tbody>
    `;

    items.forEach((p: any) => {
      const base = Number(p.basePrice ?? 0);
      const taxRate = Number(p.taxRate ?? 0);
      const gross = Number(p.priceGross ?? 0);
      const taxAmount = gross - base;

      html += `
        <tr>
          <td>${p.code}</td>
          <td>${p.code}</td>
          <td>${p.name}</td>
          <td>$${base.toFixed(2)}</td>
          <td>${taxRate.toFixed(2)}%</td>
          <td>$${taxAmount.toFixed(2)}</td>
          <td>$${gross.toFixed(2)}</td>
          <td>SI</td>
          <td>SI</td>
          <td>SI</td>
        </tr>
      `;
    });

    html += `
      </tbody>
    </table>

    <div class="footer">REGISTROS DEL GRUPO: ${items.length}</div>
    `;
  });

  html += `
</body>
</html>
`;

  printViaIframe(html);
}
