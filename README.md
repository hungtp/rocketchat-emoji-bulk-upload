# Rocketchat emoji bulk upload
Bulk upload for custom emoji of rocket.chat

# Get Rocketchat user id & token

1. In your Rocketchat web version, click on avatar -> `My Account`
2. Click on `Personal Access Tokens`
3. Fill your token name into the input at the top
4. Check `Ignore Two Factor Authentication` checkbox
5. Click button `Add`
6. A dialog which contains your user id & token will be displayed
7. Fill received values to corresponsing key in `.env` file


# Usage

1. Download & install [node.js (version >= 14.0)](https://nodejs.org/en/download/)
2. Clone or Download ZIP of this repository
3. Edit file `.env`, see `.env.example` for more details
4. Open terminal, run commands:
```bat
cd /path/to/repository/folder
npm install
```
5. Place your emoji pack into `emoji` folder (you can also define a custom path at run time)
6. To start upload emoji,  run commands:
```bat
cd /path/to/repository/folder
node index.js
```

## Others
There are two modes of uploading emoji:
  * **Number-based name**: uploaded emojis name will be numbered with a prefix name (Ex: with prefix `emoji_`, uploaded emojis name will be emoji_1, emoji_2,...) 
  * **File name**: uploaded emojis name will be name of uploaded file. The name will allow only number, alphabet and underscore, all other characters will be converted to underscore (Ex: `smile cute.gif` -> `smile_cute`)

Nested folder is possible: if `Number-based name` is on, emojis in nested folders will get name with prefix is name of folder.
