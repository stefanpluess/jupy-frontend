// CommentNode.tsx
import React, { useState, ChangeEvent } from "react";
import { Handle, Position } from "reactflow";

interface CommentNodeProps {
  nodeId: string;
  onClose: () => void;
  onSaveComment: (comment: string) => void;
}

const CommentNode: React.FC<CommentNodeProps> = ({
  nodeId,
  onClose,
  onSaveComment,
}) => {
  const [comment, setComment] = useState("");

  const handleCommentChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    setComment(event.target.value);
  };

  const handleSaveComment = () => {
    onSaveComment(comment);
    onClose();
  };

  return (
    <>
      <div>
        <textarea value={comment} onChange={handleCommentChange} />
        <button onClick={handleSaveComment}>Save Comment</button>
      </div>
      <Handle type="target" position={Position.Left} />
    </>
  );
};

export default CommentNode;
