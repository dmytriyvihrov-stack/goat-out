// Review harness only. Does not change any shipped game file.
window.addEventListener('load',()=>{
  const box=document.createElement('pre'); box.id='review-results';
  box.style='position:fixed;top:0;left:0;z-index:999;color:white;background:#111d;max-height:25vh;overflow:auto;font:12px monospace;pointer-events:none';
  document.body.appendChild(box);
  game.autoPause=false; game.menu.panel=null;
  SMOKE.run(['L0','L1','L2','L3','L4','L5','L6','L7','N','T2'],[11,22],'review');
  const ticker=setInterval(()=>{
    box.textContent=SMOKE.report('review');
    if(SMOKE.res.review.done){clearInterval(ticker);game.frame=()=>{};}
  },1000);
});
