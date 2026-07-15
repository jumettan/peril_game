export function handlePause(gs, ps) {
    console.log();
    if (ps.isPaused) {
        console.log("==== Pause Detected ====");
        gs.pauseGame();
    }
    else {
        console.log("==== Resume Detected ====");
        gs.resumeGame();
    }
    console.log("------------------------");
}
