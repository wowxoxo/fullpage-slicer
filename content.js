(async function () {
    const sessionId = Date.now();
    const dpr = window.devicePixelRatio;
  
    const scrollYPositions = [];
    const captures = [];
  
    const viewportHeight = window.innerHeight;
    const totalHeight = Math.max(
      document.body.scrollHeight,
      document.documentElement.scrollHeight
    );
  
    const width = window.innerWidth;
    let offset = 0;
  
    // Optional: hide fixed elements to prevent ghosting
    const style = document.createElement('style');
    style.innerText = `
      * {
        transition: none !important;
      }
      [data-gofullpage-hidden] {
        display: none !important;
      }
    `;
    document.head.appendChild(style);
  
    document.querySelectorAll('*').forEach(el => {
      const style = getComputedStyle(el);
      if (style.position === 'fixed' || style.position === 'sticky') {
        el.setAttribute('data-gofullpage-hidden', 'true');
      }
    });
  
    while (offset + viewportHeight < totalHeight) {
      scrollYPositions.push(offset);
      offset += viewportHeight;
    }
  
    // Add final bottom snap
    if (scrollYPositions.at(-1) !== totalHeight - viewportHeight) {
      scrollYPositions.push(totalHeight - viewportHeight);
    }
  
    for (let y of scrollYPositions) {
      window.scrollTo(0, y);
      await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
  
      const dataUrl = await new Promise(resolve => {
        chrome.runtime.sendMessage({ type: 'capture' }, resolve);
      });
  
      captures.push({ y, dataUrl });
    }
  
    // Restore fixed elements
    document.querySelectorAll('[data-gofullpage-hidden]').forEach(el => {
      el.removeAttribute('data-gofullpage-hidden');
    });
    style.remove();
  
    // Load images
    const images = await Promise.all(captures.map(cap => {
      return new Promise(resolve => {
        const img = new Image();
        img.src = cap.dataUrl;
        img.onload = () => resolve({ ...cap, img });
      });
    }));
  
    const canvas = document.createElement('canvas');
    canvas.width = images[0].img.width;
    canvas.height = images.reduce((sum, chunk, i) => {
      const remainder = (i === images.length - 1)
        ? totalHeight - chunk.y
        : chunk.img.height / dpr;
      return sum + remainder * dpr;
    }, 0);
    const ctx = canvas.getContext('2d');
  
    let yOffset = 0;
    for (let i = 0; i < images.length; i++) {
      const { img, y } = images[i];
      const remainder = (i === images.length - 1)
        ? (totalHeight - y) * dpr
        : img.height;
      ctx.drawImage(img, 0, 0, img.width, remainder, 0, yOffset, img.width, remainder);
      yOffset += remainder;
    }
  
    // Slice into chunks for Figma
    const maxHeight = 4096;
    let offsetY = 0;
    let index = 1;
  
    while (offsetY < canvas.height) {
      const chunkHeight = Math.min(maxHeight, canvas.height - offsetY);
      const chunkCanvas = document.createElement('canvas');
      chunkCanvas.width = canvas.width;
      chunkCanvas.height = chunkHeight;
  
      const chunkCtx = chunkCanvas.getContext('2d');
      chunkCtx.drawImage(canvas, 0, offsetY, canvas.width, chunkHeight, 0, 0, canvas.width, chunkHeight);
  
      const url = chunkCanvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = url;
      link.download = `screenshot_${sessionId}_part_${index++}.png`;
      link.click();
  
      offsetY += chunkHeight;
    }
  
    alert('Done! Sliced and saved.');
  })();
  