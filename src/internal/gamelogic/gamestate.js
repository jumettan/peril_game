export class GameState {
    player;
    paused;
    constructor(username) {
        this.player = {
            username,
            units: {},
        };
        this.paused = false;
    }
    resumeGame() {
        this.paused = false;
    }
    pauseGame() {
        this.paused = true;
    }
    isPaused() {
        return this.paused;
    }
    addUnit(u) {
        this.player.units[u.id] = u;
    }
    removeUnitsInLocation(loc) {
        for (const [id, unit] of Object.entries(this.player.units)) {
            if (unit.location === loc) {
                delete this.player.units[Number(id)];
            }
        }
    }
    updateUnit(u) {
        this.player.units[u.id] = u;
    }
    getUsername() {
        return this.player.username;
    }
    getUnitsSnap() {
        return Object.values(this.player.units);
    }
    getUnit(id) {
        return this.player.units[id];
    }
    getPlayerSnap() {
        const unitsCopy = {};
        for (const [id, unit] of Object.entries(this.player.units)) {
            unitsCopy[Number(id)] = { ...unit };
        }
        return {
            username: this.player.username,
            units: unitsCopy,
        };
    }
}
