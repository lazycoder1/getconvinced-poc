#!/usr/bin/env node

const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawn } = require("child_process");

function printUsageAndExit() {
    const bin = path.basename(process.argv[1]);
    console.log(
        `\nUsage:\n  ${bin} <input.mov> [output.gif] [--fps N] [--width W] [--height H] [--start 00:00:05.0] [--duration 3.5] [--loop N]\n\nOptions:\n  --fps N         Frames per second for GIF (default: 12)\n  --width W       Output width in pixels (default: source width)\n  --height H      Output height in pixels (default: auto, keeps aspect if width set)\n  --start TS      Start timestamp (e.g., 00:00:03.5)\n  --duration SEC  Clip duration in seconds (e.g., 4.2)\n  --loop N        Loop count (0=infinite, default: 0)\n\nExamples:\n  ${bin} demo.mov\n  ${bin} demo.mov demo.gif --fps 15 --width 720\n  ${bin} demo.mov demo.gif --start 00:00:02.0 --duration 3 --fps 10 --width 640 --loop 0\n`
    );
    process.exit(1);
}

function parseArgs(argv) {
    const args = { fps: 12, width: undefined, height: undefined, start: undefined, duration: undefined, loop: 0 };
    const positionals = [];
    for (let i = 0; i < argv.length; i++) {
        const token = argv[i];
        if (!token.startsWith("--")) {
            positionals.push(token);
            continue;
        }
        const key = token.slice(2);
        const next = argv[i + 1];
        switch (key) {
            case "fps":
                args.fps = Number(next);
                i++;
                break;
            case "width":
                args.width = Number(next);
                i++;
                break;
            case "height":
                args.height = Number(next);
                i++;
                break;
            case "start":
                args.start = next;
                i++;
                break;
            case "duration":
                args.duration = Number(next);
                i++;
                break;
            case "loop":
                args.loop = Number(next);
                i++;
                break;
            default:
                console.warn(`Unknown option: --${key}`);
                break;
        }
    }
    return { positionals, options: args };
}

function ensureFfmpegAvailable() {
    return new Promise((resolve, reject) => {
        const proc = spawn("ffmpeg", ["-version"], { stdio: "ignore" });
        proc.on("error", () => reject(new Error("ffmpeg not found. Install it, e.g., brew install ffmpeg")));
        proc.on("exit", (code) => {
            if (code === 0) return resolve();
            reject(new Error("ffmpeg not available. Install it, e.g., brew install ffmpeg"));
        });
    });
}

function runFfmpeg(args, label) {
    return new Promise((resolve, reject) => {
        const proc = spawn("ffmpeg", args, { stdio: "inherit" });
        proc.on("error", reject);
        proc.on("exit", (code) => {
            if (code === 0) return resolve();
            reject(new Error(`${label} failed with exit code ${code}`));
        });
    });
}

async function main() {
    const { positionals, options } = parseArgs(process.argv.slice(2));
    if (positionals.length < 1) {
        printUsageAndExit();
    }

    const inputPath = path.resolve(positionals[0]);
    if (!fs.existsSync(inputPath)) {
        console.error(`Input file not found: ${inputPath}`);
        process.exit(1);
    }

    const outputPath = path.resolve(
        positionals[1] || path.join(path.dirname(inputPath), path.basename(inputPath, path.extname(inputPath)) + ".gif")
    );

    const palettePath = path.join(os.tmpdir(), `palette_${Date.now()}_${Math.random().toString(36).slice(2)}.png`);

    const scalePart = (() => {
        const width = options.width;
        const height = options.height;
        if (width && height) return `scale=${width}:${height}:flags=lanczos`;
        if (width && !height) return `scale=${width}:-1:flags=lanczos`;
        if (!width && height) return `scale=-1:${height}:flags=lanczos`;
        return `scale=iw:ih:flags=lanczos`;
    })();

    const fpsPart = `fps=${Math.max(1, Math.floor(options.fps || 12))}`;

    const paletteFilters = `${fpsPart},${scalePart},palettegen`;
    const useFilters = `${fpsPart},${scalePart}[x];[x][1:v]paletteuse`;

    const seekArgs = [];
    if (options.start) seekArgs.push("-ss", options.start);
    if (typeof options.duration === "number" && !Number.isNaN(options.duration)) seekArgs.push("-t", String(options.duration));

    try {
        await ensureFfmpegAvailable();
        console.log("Generating palette...");
        await runFfmpeg(["-y", ...seekArgs, "-i", inputPath, "-vf", paletteFilters, palettePath], "palettegen");

        console.log("Creating GIF...");
        const loopCount = Number.isFinite(options.loop) ? options.loop : 0;
        const args = [
            "-y",
            ...seekArgs,
            "-i",
            inputPath,
            "-i",
            palettePath,
            "-filter_complex",
            useFilters,
            "-loop",
            String(loopCount),
            outputPath,
        ];
        await runFfmpeg(args, "gif encode");
        console.log(`\n✅ Wrote GIF: ${outputPath}`);
    } catch (err) {
        console.error("\n❌ Conversion failed:", err.message || err);
        process.exitCode = 1;
    } finally {
        try {
            if (fs.existsSync(palettePath)) fs.unlinkSync(palettePath);
        } catch {}
    }
}

if (require.main === module) {
    main();
}

module.exports = { main };
