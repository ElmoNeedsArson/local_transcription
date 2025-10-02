# Setup Guide for Local-Transcription Plugin
This is the setup guide for the local transcription plugin on windows. This is a desktop ONLY plugin. 

Note: Use powershell, not CMD. 

## 1. ffmpeg
Install ffmpeg

Test if ffmpeg works by running
```sh
ffmpeg
```

## 2. whisper
Follow this whisper youtube tutorial: 
[Easy Whisper Installation](https://www.youtube.com/watch?v=R5pZPpIIUzA)
If you find it sus because it has some third party links, move on to the next step for the manual installation. 

If you get any errors with this one line solution, follow the manual steps:
[text](https://hub.tcno.co/ai/whisper/install/)

> [!Important:]
> Dont listen to the steps where they rename the python executables. Just follow my steps below

If you have issues with your python version, good fucking luck. But you can start by running
```sh
python -V
```
If it does not return a version between 3.10.6 and 3.10.11, you will need to change it.

Run:
```sh
where.exe python
```
This will deliver you the python versions you have on your device in the environment variables. If the wrong version is at the top, you will need to change the order of your environment variables. If there is no python you will need to install it [here](https://www.python.org/downloads/), and make sure you add this to your environment variables: 

`C:\Users\[yourusername]\AppData\Local\Programs\Python\Python310\Scripts\`
`C:\Users\[yourusername]\AppData\Local\Programs\Python\Python310\`

> [!Note:] 
> This is the most likely path, but check where your python is installed. And ofcourse change the Python310 to reflect the actual version you are using in the environment variable. 

After the python version is correct, retry the oneliner from the video, if it still does not work, go back to the manual steps. 

Test if whisper works by running
```sh
whisper --help
```

## 3. Obsidian Plugin
Put the plugin folder into the `.obsidian\plugins\` directory. (Could use git clone)
Or if publicly listed, download from the community plugins.

You will need to run some npm initialization commands, to actually run and update the plugin.

```sh
npm init
npm install
npm install --save-dev @types/node
npm install --save-dev obsidian
```

After which you should be able to run, and you should because that is what builds the actual main.js file.  
```sh
npm run build
```

Lastly: In obsidian turn the plugin on. 

Notes: The plugin (through whisper) generates 5 files that contain the extracted text of the audio in the same folder as your audio file is located. It will then delete this files to not unnnecsarrily clutter your folders. Be aware if you have a (".txt", ".json", ".vtt", ".srt", ".tsv") note with the same name as your audio in said folder, the plugin will delete it. 