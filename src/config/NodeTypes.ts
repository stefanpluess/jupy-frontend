import { NodeTypes } from 'reactflow';
import { SimpleNode, SimpleOutputNode, GroupNode, MarkdownNode } from '../components/ui';

/**
 * This file defines the node types that are rendered in the ReactFlow used in Home component
*/

const nodeTypes: NodeTypes = {
    node: SimpleNode,
    outputNode: SimpleOutputNode,
    group: GroupNode,
    mdNode: MarkdownNode,
};

export default nodeTypes;