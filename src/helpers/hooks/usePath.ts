import { useParams } from 'react-router-dom';

/**
 * Returns the path from the URL parameter '*'.
 */
const usePath = () => {
  const path = useParams()["*"] ?? '';
  return path;
};

export default usePath;