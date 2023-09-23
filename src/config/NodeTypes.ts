import { NodeTypes } from 'reactflow';
import { SimpleNode, SimpleOutputNode, GroupNode, MarkdownNode } from '../components/ui';

const nodeTypes: NodeTypes = {
    node: SimpleNode,
    outputNode: SimpleOutputNode,
    group: GroupNode,
    mdNode: MarkdownNode,
};

export default nodeTypes;