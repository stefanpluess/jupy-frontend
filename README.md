# jupy-frontend
The Frontend Repository for the Jupy-Canvas

![Jupy](/public/jupy.jpg)


This project transforms Jupyter notebooks to overcome their limitations:

- **Unlimited space**: interact with Jupyter on a 2D-Canvas.

- **Dynamic Branching**: Branch as much as you want, each branch becomes a new virtual Bubble Cell which is each an individual kernel.

- **Flexible Cells**: Create unlimited cells within each and every bubble.

- **Bubble Groups**: Organize content in bubbles, connected through edges.

- **Effortless Updates**: Changes in parent bubbles propagate to child bubbles.

- **Isolated Siblings**: Sibling Bubbles work independently.

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
To start the jupy-backend please refer to its [readme](https://github.com/Jupyter-Canvas/jupy-backend#readme).

Once the application is up and running, it can be accessed on http://localhost:3000

> ℹ️ Please note that while it is feasible to start the application using a standard Jupyter Server, it may result in limited functionality. Certain features, such as branching, may not operate as expected in this mode. To start the standard server, run the following command:
```bash
jupyter server --ServerApp.allow_origin='*'
```

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

## :whale: Docker

To run the project using docker, you need to have [Docker](https://www.docker.com/) installed.

1. Clone the repository:
    ```bash
    git clone https://github.com/Jupyter-Canvas/jupy-frontend
    ```
2. Create a .env file in the root directory of the project and add the token copied from the backend:
    ```bash
    REACT_APP_API_TOKEN=...
    ```
3. Build and run the docker dontainer (in the root directory):
   ```bash
   cd jupy-frontend
   docker-compose up --build
   ```

