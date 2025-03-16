import { useReactFlow } from "reactflow";
import useDeleteOutput from "./useDeleteOutput";
import useInsertOutput from "./useInsertOutput";
import useNodesStore from "../nodesStore";

//This hook is called when code was executed by other users
function useCollabOutputUtils() {
    const insertOutput = useInsertOutput();
    const deleteOutput = useDeleteOutput();
    const {getNode} = useReactFlow();
    const setOutputTypeEmpty = useNodesStore((state) => state.setOutputTypeEmpty);
    function collabOutputUtils(node_id : string) {
        if(getNode(node_id + '_output')) {
            deleteOutput(node_id + '_output');
            setOutputTypeEmpty(node_id, false)
        } else {
            insertOutput([node_id], true);
        }
    }
    return {collabOutputUtils}
}

export default useCollabOutputUtils;