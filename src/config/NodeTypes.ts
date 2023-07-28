import { NodeTypes } from 'reactflow';
import { SimpleNode, SimpleOutputNode, GroupNode } from '../components/ui';

const nodeTypes: NodeTypes = {
    node: SimpleNode,
    outputNode: SimpleOutputNode,
    group: GroupNode,
};

export default nodeTypes;