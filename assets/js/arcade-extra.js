
window.CK = window.CK || {};
CK.arcade = CK.arcade || {};

CK.arcade.start2048 = () => {
  document.getElementById('arcade-overlay').style.display = 'flex';
  const html = `
    <div style="width:100%; height:100%; position:relative;">
      <iframe src="https://gabrielecirulli.github.io/2048/" style="width:100%; height:100%; border:none;"></iframe>
      <button class="p-btn p-btn-ghost" style="position:absolute; top:20px; right:20px; z-index:10; background:rgba(0,0,0,0.5);" onclick="document.getElementById('arcade-overlay').style.display='none'">Exit Game</button>
    </div>
  `;
  document.getElementById('arcade-cabinet-content').innerHTML = html;
};

CK.arcade.startHextris = () => {
  document.getElementById('arcade-overlay').style.display = 'flex';
  const html = `
    <div style="width:100%; height:100%; position:relative;">
      <iframe src="https://hextris.io/" style="width:100%; height:100%; border:none;"></iframe>
      <button class="p-btn p-btn-ghost" style="position:absolute; top:20px; right:20px; z-index:10; background:rgba(0,0,0,0.5);" onclick="document.getElementById('arcade-overlay').style.display='none'">Exit Game</button>
    </div>
  `;
  document.getElementById('arcade-cabinet-content').innerHTML = html;
};
