import {createWithEqualityFn} from 'zustand/traditional';
import MonacoEditor, { Editor} from '@monaco-editor/react';

export type user = {
    client_id : string;
    clientName : string;
    colorCode : string;
}


export type updateWebSocketStore = {

    //websocket
    websocket : WebSocket | undefined;
    setWebSocket: (ws : WebSocket | undefined, username : string | undefined) => void;
    closeWebSocket: () => void;
    sendMessage: (message : string) => void;
    isWebSocketSet : () => boolean;

    //clients chosen name
    client_name : string;
    getClientName : () => string;


    //user positions
    userPositions : Record<string, Record<string, user>>;
    updateUserPositions : (user: user, node_id: string) => void;
    setUserPositions : (userPositions : Record<string, Record<string, user>>) => void;
    getUserNameById : (id : string) => string | undefined;
    removeUser : (client_id : string) => void;

    //alert functionality when joining/leaving session
    joinedUser : string;
    setJoinedUser : (username : string) => void;
    leftUser : string;
    setLeftUser : (username : string) => void;
    showJoinedUser : boolean;
    setShowJoinedUser : ( value : boolean) => void;
    showLeftUser : boolean;
    setShowLeftUser : (value : boolean) => void;
    
}

export const useUpdateWebSocketStore = createWithEqualityFn<updateWebSocketStore>((set, get) => ({
    websocket : undefined,
    client_name : "",
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
    setUserPositions : ( userPositions: Record<string, Record<string, user>>) => {
        set({userPositions : userPositions});
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
    getUserNameById : (id : string) => {
        for (const node_id in get().userPositions) {
            const clients = get().userPositions[node_id];
            for (const clientId in clients) {
                if (clientId === id) {
                    return clients[clientId].clientName;
                }
            }
        }
    },
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
    setClientName: (username : string) => {set({client_name:username})},
    isWebSocketSet: () => { if (get().websocket) {
        return true;
    }else {
        return false;
    }},
    getClientName : () => {
        return get().client_name;
    },
    
    joinedUser : "",
    setJoinedUser(username : string) {
        set({joinedUser : username})
    },
    leftUser : "",
    setLeftUser(username : string) {
        set({leftUser : username});
    },
    showJoinedUser : false,
    setShowJoinedUser(value : boolean) {
        set({showJoinedUser : value})
    },
    showLeftUser : false,
    setShowLeftUser(value : boolean) {
        set({showLeftUser : value})
    },
}))

