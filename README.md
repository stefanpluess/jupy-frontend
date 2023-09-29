# jupy-frontend
The Frontend Repository for the Jupy-Canvas

![Jupy](/public/jupy.jpg)


This project transforms Jupyter notebooks to overcome their limitations:
- **Unlimited space**: interact with Jupyter on a 2D-Canvas.

- **Dynamic Branching**: branch as much as you want, each branch becomes a new virtual notebook.

- **Flexible Cells**: create unlimited cells within each branch.

- **Bubble Groups**: organize content in bubbles, connected through edges.

- **Effortless Updates**: changes in parent bubbles propagate to child bubbles.

- **Isolated Siblings**: sibling bubbles work independently.

Experience unparalleled flexibility, organization and productivity in the future of notebooks. 
Welcome to a new era of data exploration and code development!


## ⚙️ Installation

To run the project locally, you need to have [Node.js](https://nodejs.org/en/) installed.

1. Clone the repository and install the dependencies:
    ```bash
    git clone https://github.com/Jupyter-Canvas/jupy-frontend
    cd jupy-frontend
    npm install
    ```
2. Create a `.env` file in the root directory of the project and add the following line:
    ```bash
    REACT_APP_API_TOKEN=
    ```
    This will tell the frontend which token to use to authenticate with the backend.

## 💻 Usage
To start the application, run the following command:
```bash
npm run start-set-token
```
You will be asked to enter the token from the backend.
This will set the token in the `.env` file and start the project.

## 📝 Note
If you plan to utilize the application in Safari, you're all set to proceed without any additional steps.

However, if you intend to use it in Chrome, you'll need to deactivate the same origin policy. 
> ⚠️ Kill all chrome instances before running command and do not use this particular tab for browsing the web!

- To read more: https://stackoverflow.com/a/19317888/19886556

To achieve this, initiate Chrome using the following command:

**🪟 For Windows  press windows key + r and type in the following:**
```bash
chrome.exe --user-data-dir="C:\path\to\chrome\user\data\directory" --disable-web-security
```
**🍎 For mac:**
```bash
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --disable-web-security --user-data-dir=/path/to/chrome/user/data/directory
```