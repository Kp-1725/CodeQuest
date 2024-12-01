function playIntro(display, map, i) {
    if (typeof i === 'undefined') { 
        i = map.getHeight(); 
    }

    if (i < 0) {
        display._intro = true; // Mark intro as complete
    } else {
        display.clear();
        display.drawText(0, i - 2, "%c{#0f0}> initialize");
        display.drawText(15, i + 3, "Code Quest");
        display.drawText(3, i + 12, "a game by Curly Braces");
        display.drawText(10, i + 22, "Press any key to begin ...");

        setTimeout(function () {
            playIntro(display, map, i - 1); // Correct recursive call
        }, 100);
    }
}
