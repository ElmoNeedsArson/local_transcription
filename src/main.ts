const { exec } = require("child_process");
const path = require("path");
const fs = require("fs");

import { Plugin, Notice, MarkdownView, TFile } from "obsidian";

export default class TranscribePlugin extends Plugin {
    private statusBarEl: HTMLElement | null = null;
    
    showStatus(message: string) {
        if (!this.statusBarEl) {
            this.statusBarEl = this.addStatusBarItem();
        }
        this.statusBarEl.setText(message);
    }

    clearStatus() {
        if (this.statusBarEl) {
            this.statusBarEl.setText("");
        }
    }

    async onload() {
        console.log("Loading Local Audio Transcriber plugin");
        
        this.addCommand({
            id: "transcribe-linked-audio-auto",
            name: "Transcribe linked audio (auto-detect language)",
            callback: () => this.transcribeLinkedAudio("auto"),
        });

        this.addCommand({
            id: "transcribe-linked-audio-en",
            name: "Transcribe linked audio (English)",
            callback: () => this.transcribeLinkedAudio("en"),
        });

        this.addCommand({
            id: "transcribe-linked-audio-nl",
            name: "Transcribe linked audio (Dutch)",
            callback: () => this.transcribeLinkedAudio("nl"),
        });
    }

    async transcribeLinkedAudio(language: "auto" | "en" | "nl"): Promise<void> {
        const view = this.app.workspace.getActiveViewOfType(MarkdownView);
        if (!view || !view.file) {
            new Notice("Open and save the note first.");
            return;
        }
        const file = view.file as TFile;

        let content = view.editor.getValue();
        const audioRegex = /!\[\[([^\]]+\.(?:mp3|wav|ogg|m4a))\]\]/gi;

        const matches: { full: string; fileName: string; index: number; length: number }[] = [];
        let m: RegExpExecArray | null;
        while ((m = audioRegex.exec(content)) !== null) {
            matches.push({ full: m[0], fileName: m[1], index: m.index, length: m[0].length });
        }

        if (matches.length === 0) {
            new Notice("No audio embeds found in this note.");
            return;
        }

        new Notice(`Found ${matches.length} audio file(s). Transcribing...`);

        const adapterAny = this.app.vault.adapter as any;
        const basePath: string = typeof adapterAny.getBasePath === "function" ? adapterAny.getBasePath() : "";

        let updatedContent = content;

        for (let i = matches.length - 1; i >= 0; i--) {
            const match = matches[i];
            const dest = this.app.metadataCache.getFirstLinkpathDest(match.fileName, file.path);
            if (!dest) continue;

            const absPath = basePath ? path.join(basePath, dest.path) : dest.path;
            const baseOutputPath = absPath.replace(path.extname(absPath), "");
            const transcriptPath = baseOutputPath + ".txt";
            const whisperExtensions = [".txt", ".json", ".vtt", ".srt", ".tsv"];

            try {
                new Notice(`Transcribing ${match.fileName}...`);
                await this.runWhisper(absPath, transcriptPath, language);

                let transcript = fs.existsSync(transcriptPath) ? fs.readFileSync(transcriptPath, "utf8") : "";

                // Delete all Whisper output files
                for (const ext of whisperExtensions) {
                    const outPath = baseOutputPath + ext;
                    if (fs.existsSync(outPath)) {
                        try {
                            fs.unlinkSync(outPath);
                            console.log(`Deleted Whisper output file: ${outPath}`);
                        } catch (err) {
                            console.warn(`Failed to delete Whisper output file: ${outPath}`, err);
                        }
                    }
                }

                new Notice(`Finished ${match.fileName}`);
                const insertText = `\n\n**Transcript (${language === "auto" ? "auto-detected" : language}):**\n${transcript}\n`;
                const insertPos = match.index + match.length;
                updatedContent = updatedContent.slice(0, insertPos) + insertText + updatedContent.slice(insertPos);
            } catch (e) {
                console.error(e);
                new Notice(`Error transcribing ${match.fileName}`);
            }
        }

        await this.app.vault.modify(file, updatedContent);
        new Notice("Transcription finished.");
    }

    runWhisper(audioPath: string, transcriptPath: string, language: "auto" | "en" | "nl"): Promise<void> {
        return new Promise((resolve, reject) => {
            const langFlag = language === "auto" ? "" : `--language ${language}`;
            const cmd = `whisper "${audioPath}" --model medium ${langFlag} --output_dir "${path.dirname(audioPath)}"`;

            const child = exec(cmd);

            // Start status bar
            let seconds = 0;
            this.showStatus(`Transcribing ${path.basename(audioPath)}...`);

            const interval = setInterval(() => {
                seconds += 5;
                this.showStatus(`Transcribing ${path.basename(audioPath)}... (${seconds}s elapsed)`);
            }, 5000);

            child.stderr?.on("data", (data: string) => console.error(`[Whisper stderr]: ${data}`));

            child.on("close", (code: number) => {
                clearInterval(interval);
                if (code === 0) {
                    this.showStatus(`Finished ${path.basename(audioPath)}`);
                    setTimeout(() => this.clearStatus(), 3000);
                    resolve();
                } else {
                    this.showStatus(`Error transcribing ${path.basename(audioPath)}`);
                    setTimeout(() => this.clearStatus(), 5000);
                    reject(new Error(`Whisper exited with code ${code}`));
                }
            });
        });
    }
}