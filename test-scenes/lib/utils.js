function signalTestComplete(viewer) {
  const div = document.createElement("div");
  div.id = "percyLoaded";
  if (!viewer) {
    document.body.appendChild(div);
  } else {
    viewer.scene.canvas.spinner.on("zeroProcesses", () => {
      // All outstanding tasks complete
      document.body.appendChild(div);
    });
  }
}

export { signalTestComplete };
