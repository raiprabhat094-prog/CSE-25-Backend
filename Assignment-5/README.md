# Assignment 5 — Local File Library

A small local web app for uploading files from your computer, searching the files saved by the app, and downloading them again.

## Run it

1. Open a terminal in `Assignment-5`.
2. Run `npm install` once, then `npm start`.
3. Visit <http://localhost:3001>.
4. Select files or drag them into the upload area. They are stored in `Assignment-5/files`.

The search field filters saved filenames. Each result has a download button. Files are limited to 100 MB each, and duplicate filenames are kept safe by refusing to overwrite the existing file. The API enables CORS for development clients on other origins. Keep this server on your own trusted computer/network; it has no login or access control.
