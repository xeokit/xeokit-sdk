function signalTestComplete() {
    const div = document.createElement("div");
    div.id = "percyLoaded";
    document.body.appendChild(div);
}

export {signalTestComplete};