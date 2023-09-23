// usePath.js
import { useParams } from 'react-router-dom';

const usePath = () => {
  const path = useParams()["*"] ?? '';
  return path;
};

export default usePath;