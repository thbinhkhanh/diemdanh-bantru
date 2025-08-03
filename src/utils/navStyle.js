export const navStyle = (path, currentPath) => {
  const isExactMatch = currentPath === path;
  return {
    color: 'white',
    padding: '6px 12px',
    backgroundColor: isExactMatch ? '#1565c0' : 'transparent',
    borderBottom: isExactMatch ? '2px solid white' : 'none',
    borderRadius: '4px',
    textTransform: 'none',
    fontWeight: isExactMatch ? 'bold' : 'normal',
  };
};

export const navStyleGroup = (paths, currentPath) => ({
  color: 'white',
  padding: '6px 12px',
  backgroundColor: paths.some(p => currentPath.includes(p)) ? '#1565c0' : 'transparent',
  borderBottom: paths.some(p => currentPath.includes(p)) ? '3px solid white' : 'none',
  borderRadius: '4px',
  textTransform: 'none',
});
