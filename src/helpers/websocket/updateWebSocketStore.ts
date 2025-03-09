import {createWithEqualityFn} from 'zustand/traditional';
import MonacoEditor, { Editor} from '@monaco-editor/react';

export type CursorPosition = {
    lineNumber : number;
    column : number;
    clientName : string;
    client_id : string;
    colorName : string;
}

export type user = {
    client_id : string;
    clientName : string;
    colorCode : string;
}

/* export type user = {
    client_id : string;
    clientName : string;
    colorCode : string;
    colorName : string;
} */

export type updateWebSocketStore = {
    websocket : WebSocket | undefined;
    setWebSocket: (ws : WebSocket | undefined, username : string | undefined) => void;
    closeWebSocket: () => void;
    sendMessage: (message : string) => void;
    cursorPositions: Record<string, Record<string, CursorPosition>>;
    updateCursorPosition: (position: CursorPosition, node_id: string) => void;
    client_name : string;
    isWebSocketSet : () => boolean;
    getClientName : () => string;
    users : user[];
    addUser : (client_id : string, clientName : string, colorCode : string, colorName : string) => void;
    getUsers : () => user[];
    removeUser : (client_id : string) => void;
    userPositions : Record<string, Record<string, user>>;
    updateUserPositions : (user: user, node_id: string) => void;
    
}

export const useUpdateWebSocketStore = createWithEqualityFn<updateWebSocketStore>((set, get) => ({
    websocket : undefined,
    client_name : "",
    cursorPositions : {},
    closeWebSocket : () => {
        get().websocket?.close()
        get().setWebSocket(undefined, undefined)
    },
    userPositions : {},
    updateUserPositions : (user: user, node_id : string) => {
        set((state) => {
            const updatedUserPositions = {...state.userPositions};

            for(const existingNodeId in updatedUserPositions) {
                if (updatedUserPositions[existingNodeId][user.client_id]) {
                    delete updatedUserPositions[existingNodeId][user.client_id]
                }
            }

            if(!updatedUserPositions[node_id]) {
                updatedUserPositions[node_id] = {};
            }
            updatedUserPositions[node_id][user.client_id] = user;
            return {userPositions:updatedUserPositions}
        })
    },
    removeUser : (client_id : string) => {
        set((state) => {
            const updatedUserPositions = {...state.userPositions};
            for(const node_id in updatedUserPositions) {
                if (updatedUserPositions[node_id][client_id]) {
                    delete updatedUserPositions[node_id][client_id];

                    if (Object.keys(updatedUserPositions[node_id]).length === 0) {
                        delete updatedUserPositions[node_id];
                    }
                    break;
                }

            }
            console.log(JSON.stringify(updatedUserPositions))
            return {userPositions: updatedUserPositions};
        })
    },
    users : [],
    addUser : (client_id : string, clientName : string, colorCode : string, colorName : string) => {
        const newUser = {
            client_id,
            clientName,
            colorCode,
            colorName
        }
        set({users : get().users.concat(newUser)})
    },
    getUsers : () => get().users,
    setWebSocket : (ws : WebSocket | undefined, username : string | undefined) => {
        set({websocket:ws, client_name : username})
    },
    sendMessage: (message : string) => {
        if(get().websocket == undefined) {
            console.log("updatesocket is undefined");
        }else {
            get().websocket!.send(message)
        }
    },
    updateCursorPosition: (position, node_id) => {
        
        set((state) => ({
            cursorPositions: {
                ...state.cursorPositions,
                [node_id] : {
                    ...state.cursorPositions[node_id],
                    [position.client_id]: position,
                },
            },
        }))
        console.log("cursorposition is: " + JSON.stringify(get().cursorPositions))
    },
    setClientName: (username : string) => {set({client_name:username})},
    isWebSocketSet: () => { if (get().websocket) {
        return true;
    }else {
        return false;
    }},
    getClientName : () => {
        return get().client_name;
    }
    
}))

