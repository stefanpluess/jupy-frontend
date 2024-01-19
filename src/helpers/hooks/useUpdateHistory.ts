import { useCallback } from "react";
import useExecutionStore from "../executionStore";
import { ExecInfoT } from "../../config/constants";

type UpdateExportImportHistoryT = {
    parent_id: string;
    parent_exec_count: number;
    child_id: string;
    child_exec_count: number;
}

function useUpdateHistory() {

    const addToHistory = useExecutionStore((state) => state.addToHistory);

    const updateExportImportHistory = useCallback((obj: UpdateExportImportHistoryT) => {
        // EXPORT
        addToHistory(obj.parent_id, {
            node_id: obj.parent_id, // provide the bubble itself in case of export
            execution_count: obj.parent_exec_count,
            type: ExecInfoT.Export,
        });

        // IMPORT
        addToHistory(obj.child_id, {
            node_id: obj.parent_id, // provide the parent bubble in case of import (from whom the knowledge is imported)
            execution_count: obj.child_exec_count,
            type: ExecInfoT.LoadParent,
        });
    }
    , [addToHistory]);

    return updateExportImportHistory;
}

export default useUpdateHistory;
