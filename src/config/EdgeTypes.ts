import { EdgeTypes } from 'reactflow';
import { GroupEdge, FloatingEdge } from '../components/ui';

/**
 * This file defines the edge types that are rendered in the ReactFlow used in Home component
*/ 

const edgeTypes: EdgeTypes = {
    groupEdge: GroupEdge,
    floatingEdge: FloatingEdge,
};

export default edgeTypes;