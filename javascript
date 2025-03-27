// ==UserScript==
// @name         Köln Kfz Termin-Vollautomat (Komplett bis Buchung + Retry)
// @namespace    http://tampermonkey.net/
// @version      3.3
// @description  Startseite-Auswahl, Terminübersicht prüfen, bei Verfügbarkeit Uhrzeit wählen & buchen. Kein Termin = zurück und retry! ✅ Mit Status-Tracker + Mehrere Wunschdaten + echte Handynummer + Button-Zurück statt Reload (fix)
// @author       ChatGPT
// @include      *termine.stadt-koeln.de/m/kfz-zulassung/extern/calendar/*
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    const wunschDaten = [
        "25.03.2025", "26.03.2025", "27.03.2025", "28.03.2025", "29.03.2025",
        "30.03.2025", "31.03.2025", "01.04.2025", "02.04.2025" 
    ];
    let aktuellerIndex = 0;

    const nutzerdaten = {
        anrede: "m",
        vorname: "placeholder",
        nachname: "placeholder",
        email: "placeholder",
        telefon: "placeholder",
        fin: "placeholder"
    };

    function log(msg) {
        console.log("[KFZ-Auto]", msg);
        updateStatus(msg);
    }

    function updateStatus(text) {
        let box = document.getElementById("kfzb_status_box");
        if (!box) {
            box = document.createElement("div");
            box.id = "kfzb_status_box";
            box.style.position = "fixed";
            box.style.bottom = "10px";
            box.style.right = "10px";
            box.style.padding = "10px 15px";
            box.style.background = "#222";
            box.style.color = "#0f0";
            box.style.fontSize = "14px";
            box.style.fontFamily = "monospace";
            box.style.borderRadius = "8px";
            box.style.zIndex = "9999";
            document.body.appendChild(box);
        }
        box.innerText = `KFZ Bot: ${text}`;
    }

    function aufStartseiteAuswahlKlicken() {
        const dropdown = document.querySelector("select[id^='service_']");
        if (dropdown) {
            if (dropdown.value !== "1") {
                dropdown.value = "1";
                dropdown.dispatchEvent(new Event("input", { bubbles: true }));
                dropdown.dispatchEvent(new Event("change", { bubbles: true }));
                log("🟢 Dropdown auf 1 gesetzt");
            } else {
                log("✅ Dropdown bereits auf 1 gesetzt");
            }

            setTimeout(() => {
                const weiterBtn = document.querySelector("button[type='submit']");
                if (weiterBtn) {
                    weiterBtn.click();
                    log("➡️ Weiter geklickt zur Kalenderseite...");
                }
            }, 800);
        } else {
            log("❌ Kein Dropdown gefunden auf Startseite");
        }
    }

    function beobachteAufUhrzeitenUndKlicke() {
        const container = document.querySelector("#calendar-content") || document.body;
        const observer = new MutationObserver(() => {
            const buttons = Array.from(document.querySelectorAll("button.card[id^='slot_']"));
            if (buttons.length > 0) {
                observer.disconnect();
                const uhrzeit = buttons[0].querySelector("strong")?.textContent?.trim();
                log(`🕐 Uhrzeit gefunden: ${uhrzeit} – klicke`);
                buttons[0].click();
            }
        });
        observer.observe(container, { childList: true, subtree: true });
    }

    function aufDatumKlickenOderZurück() {
        const terminButtons = Array.from(document.querySelectorAll("button[onclick^='showTimeSlots']"));
        const gefunden = terminButtons.find(btn => btn.innerText.includes(wunschDaten[aktuellerIndex]));
        if (gefunden) {
            log(`📅 Termin gefunden für ${wunschDaten[aktuellerIndex]} – klicke`);
            beobachteAufUhrzeitenUndKlicke();
            gefunden.click();
        } else {
            aktuellerIndex++;
            if (aktuellerIndex >= wunschDaten.length) {
                aktuellerIndex = 0;
                log("🔁 Kein Termin gefunden – gehe zurück per Button");
                const zurück = document.querySelector("a.back_button");
                if (zurück) {
                    zurück.click();
                } else {
                    log("⚠️ Kein Zurück-Button gefunden – versuche Reload");
                    setTimeout(() => {
                        window.location.href = window.location.origin + window.location.pathname;
                    }, 2000);
                }
            } else {
                log(`⏭️ Prüfe nächstes Wunschdatum: ${wunschDaten[aktuellerIndex]}`);
                setTimeout(aufDatumKlickenOderZurück, 1000);
            }
        }
    }

    function formularAusfüllenUndBuchen() {
        log("🧾 Formular – beginne Ausfüllen");
        const tryFill = (selector, value) => {
            const el = document.querySelector(selector);
            if (el) {
                el.value = value;
                el.dispatchEvent(new Event('input', { bubbles: true }));
                el.dispatchEvent(new Event('change', { bubbles: true }));
            }
        };
        tryFill("select#salutation", nutzerdaten.anrede);
        tryFill("input#first_name", nutzerdaten.vorname);
        tryFill("input#last_name", nutzerdaten.nachname);
        tryFill("input#mail", nutzerdaten.email);
        tryFill("input#phone", nutzerdaten.telefon);
        tryFill("input#fin1", nutzerdaten.fin);

        const datenschutz = document.querySelector("input#accept_data_privacy");
        if (datenschutz && !datenschutz.checked) datenschutz.click();

        log("✅ Formular ausgefüllt – buche jetzt...");
        const button = document.querySelector("button[type='submit'][data-testid='button_book-appointment']");
        if (button) {
            button.scrollIntoView({ behavior: 'smooth', block: 'center' });
            setTimeout(() => {
                button.click();
                log("🚀 Terminbuchung ausgelöst!");
            }, 1000);
        } else {
            log("❌ Buchungsbutton nicht gefunden");
        }
    }

    function istStartseite() {
        return document.querySelector("select[id^='service_']") !== null;
    }

    function istAufDatumsauswahl() {
        return document.querySelector("button[onclick^='showTimeSlots']") !== null;
    }

    function istAufFormularseite() {
        return document.querySelector("form#booking_form") !== null;
    }

    function start() {
        if (istStartseite()) {
            log("🏁 Startseite – prüfe Auswahl...");
            setTimeout(aufStartseiteAuswahlKlicken, 1000);
        } else if (istAufDatumsauswahl()) {
            log("📆 Kalenderseite – prüfe Termine...");
            setTimeout(aufDatumKlickenOderZurück, 1000);
        } else if (istAufFormularseite()) {
            log("📄 Formularseite – Ausfüllen & Buchen...");
            setTimeout(formularAusfüllenUndBuchen, 1500);
        } else {
            log("⌛ Warte auf richtige Seite...");
            setTimeout(start, 1500);
        }
    }

    window.addEventListener('load', start);
})();
