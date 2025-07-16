(async function () {
    const body = document.body;
    const html = document.documentElement;
    const totalHeight = Math.max(
      body.scrollHeight,
      body.offsetHeight,
      html.clientHeight,
      html.scrollHeight,
      html.offsetHeight
    );
  
    const viewportHeight = window.innerHeight;
    const overlap = 100; // for safety
    const sessionId = Date.now();
  
    const chunks = [];
    let offset = 0;
  
    while (offset < totalHeight) {
      window.scrollTo(0, offset);
      await new Promise(r => setTimeout(r, 300));
  
      const dataUrl = await new Promise(resolve => {
        chrome.runtime.sendMessage({ type: "capture" }, resolve);
      });
      chunks.push({ offsetY: offset, dataUrl });
  
      offset += (viewportHeight - overlap);
    }
  
    // Load all images and track true height
    const images = await Promise.all(chunks.map(chunk => {
      return new Promise(resolve => {
        const img = new Image();
        img.src = chunk.dataUrl;
        img.onload = () => resolve({ ...chunk, img });
      });
    }));
  
    const width = images[0].img.width;
    const totalImageHeight = images.length * (viewportHeight - overlap) + overlap;
  
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = totalImageHeight;
    const ctx = canvas.getContext("2d");
  
    images.forEach((chunk, i) => {
      const drawY = i * (viewportHeight - overlap);
      ctx.drawImage(chunk.img, 0, 0, width, chunk.img.height, 0, drawY, width, chunk.img.height);
    });
  
    // Slice to max 4096px chunks
    const maxHeight = 4096;
    let offsetY = 0;
    let sliceIndex = 1;
  
    while (offsetY < totalImageHeight) {
      const sliceHeight = Math.min(maxHeight, totalImageHeight - offsetY);
      const sliceCanvas = document.createElement("canvas");
      sliceCanvas.width = width;
      sliceCanvas.height = sliceHeight;
      const sliceCtx = sliceCanvas.getContext("2d");
  
      sliceCtx.drawImage(canvas, 0, offsetY, width, sliceHeight, 0, 0, width, sliceHeight);
      const sliceData = sliceCanvas.toDataURL("image/png");
  
      const link = document.createElement("a");
      link.href = sliceData;
      link.download = `screenshot_${sessionId}_part_${sliceIndex++}.png`;
      link.click();
  
      offsetY += sliceHeight;
    }
  
    alert("Done slicing and downloading!");
  })();
  