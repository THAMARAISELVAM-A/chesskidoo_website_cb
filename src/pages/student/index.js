export function mount(el, params) {
  el.innerHTML = `<div class="cls-empty" style="padding:40px 0;">
    <h2>Student Portal</h2>
    <p style="color:var(--p-muted)">Loading student dashboard…</p>
    <p style="font-size:13px;color:var(--p-muted)">Route: ${params.panel || 'home'}</p>
  </div>`;
}
