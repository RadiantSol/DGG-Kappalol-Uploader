// ==UserScript==
// @name         DGG Kappa.lol Uploader
// @namespace    Kappa.lol Paste
// @version      1.0.1
// @description  Auto-uploads images pasted into Destiny.gg chat to kappa.lol and inserts the link.
// @author       PRSEK
// @match        https://www.destiny.gg/embed/chat*
// @match        https://www.destiny.gg/bigscreen*
// @match        https://www.destiny.gg/*
// @grant        GM_xmlhttpRequest
// @connect      kappa.lol
// @run-at       document-end
// @license      MIT
// @updateURL    https://update.greasyfork.org/scripts/574655/DGG%20Kappa.lol%20Uploader.meta.js
// @downloadURL  https://update.greasyfork.org/scripts/574655/DGG%20Kappa.lol%20Uploader.user.js
// ==/UserScript==

(function() {
    'use strict';

    // Helper to insert text into the chat box and trigger React updates
    function insertAtCursor(myField, myValue) {
        if (document.selection) {
            myField.focus();
            let sel = document.selection.createRange();
            sel.text = myValue;
        } else if (myField.selectionStart || myField.selectionStart == '0') {
            const startPos = myField.selectionStart;
            const endPos = myField.selectionEnd;
            myField.value = myField.value.substring(0, startPos)
                + myValue
                + myField.value.substring(endPos, myField.value.length);
            myField.selectionStart = startPos + myValue.length;
            myField.selectionEnd = startPos + myValue.length;
        } else {
            myField.value += myValue;
        }

        // CRITICAL: Dispatch 'input' event so React/DGG sees the change
        const event = new Event('input', { bubbles: true });
        myField.dispatchEvent(event);
    }

    function uploadFile(file, textarea) {
        // Show a temporary "Uploading..." status
        const originalPlaceholder = textarea.getAttribute('placeholder');
        textarea.setAttribute('placeholder', 'Uploading to kappa.lol...');

        const formData = new FormData();
        formData.append('file', file);

        GM_xmlhttpRequest({
            method: "POST",
            url: "https://kappa.lol/api/upload",
            data: formData,
            onload: function(response) {
                try {
                    if (response.status !== 200 && response.status !== 201) {
                        throw new Error(`Upload failed: ${response.statusText}`);
                    }

                    const data = JSON.parse(response.responseText);
                    if (data.link) {
                        insertAtCursor(textarea, data.link + ' ');
                        console.log('Upload success:', data);
                    } else {
                        throw new Error('No link received from API');
                    }
                } catch (e) {
                    console.error('Kappa.lol Upload Error:', e);
                    alert('Upload failed: ' + e.message);
                } finally {
                    textarea.setAttribute('placeholder', originalPlaceholder || '');
                }
            },
            onerror: function(err) {
                console.error('Network Error:', err);
                alert('Network error during upload.');
                textarea.setAttribute('placeholder', originalPlaceholder || '');
            }
        });
    }

    // Attach listener to the chat input specifically
    document.addEventListener('paste', (e) => {
        const target = e.target;

        // Ensure we are pasting into the DGG chat textarea
        if (target.tagName !== 'TEXTAREA' || !target.closest('#chat-input-control')) return;

        const items = (e.clipboardData || e.originalEvent.clipboardData).items;

        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf("image") === 0) {
                e.preventDefault(); // Stop the image binary from pasting as text/garbage
                const blob = items[i].getAsFile();
                uploadFile(blob, target);
                return; // Handle only the first image found
            }
        }
    });
})();
