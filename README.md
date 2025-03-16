# jupy-frontend
The Frontend Repository for the Jupy-Canvas

![Jupy](/public/jupy.jpg)


This project transforms Jupyter notebooks to overcome their limitations:

- **Unlimited space**: interact with Jupyter on a 2D-Canvas.

- **Dynamic Branching**: Branch as much as you want, each branch becomes a new virtual Kernel Cell which is each an individual kernel.

- **Flexible Cells**: Create unlimited cells within each and every kernel.

- **Kernel Groups**: Organize content in kernels, connected through edges.

- **Effortless Updates**: Changes in parent kernels propagate to child kernels.

- **Isolated Siblings**: Sibling Kernels work independently.

- **Realtime collaboration**: connect to a collaborative session and start coding with others!

Experience unparalleled flexibility, organization and productivity in the future of notebooks. 
Welcome to a new era of data exploration and code development!




## :whale: Docker

To run the project using docker, you need to have [Docker](https://www.docker.com/) installed.

1. Clone the repository:
    ```bash
    git clone https://github.com/stefanpluess/jupy-canvas
    ```
2. Build and run the docker dontainer (in the root directory):
   ```bash
   cd jupy-canvas
   docker-compose up --build
   ```

