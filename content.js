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
    const devicePixelRatio = window.devicePixelRatio;
  
    const chunks = [];
    for (let offset = 0; offset < totalHeight; offset += viewportHeight) {
      window.scrollTo(0, offset);
      await new Promise(r => setTimeout(r, 250)); // let it render
  
      const dataUrl = await new Promise(resolve => {
        chrome.runtime.sendMessage({ type: "capture" }, resolve);
      });
      chunks.push(dataUrl);
    }
  
    // stitch & slice
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
  
    const img = new Image();
    img.src = chunks[0];
    await img.decode();
  
    const width = img.width;
    const totalImageHeight = chunks.length * img.height;
  
    canvas.width = width;
    canvas.height = totalImageHeight;
  
    for (let i = 0; i < chunks.length; i++) {
      const img = new Image();
      img.src = chunks[i];
      await img.decode();
      ctx.drawImage(img, 0, i * img.height);
    }
  
    // now slice to max 4096px height
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
      link.download = `screenshot_part_${sliceIndex++}.png`;
      link.click();
  
      offsetY += sliceHeight;
    }
  
    alert("Done slicing and downloading!");
  })();
  