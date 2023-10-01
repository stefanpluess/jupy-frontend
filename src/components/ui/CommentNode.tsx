// CommentNode.tsx
import React, { useState, ChangeEvent } from "react";
import { Handle, Position } from "reactflow";

interface CommentNodeProps {
  nodeId: string;
  onClose: () => void;
  onSaveComment: (comment: string) => void;
}

/**
 * CommentNode component displays a textarea and a button to save the comment for SimpleNode, 
 * meant to be used in the SimpleNode toolbar.
 * @param nodeId - The id of the node.
 * @param onClose - A function to close the comment node.
 * @param onSaveComment - A function to save the comment.
 */
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
