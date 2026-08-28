export const ADMIN_COLORS = {
  ink: '#101010',
  muted: '#686868',
  border: 'rgba(16, 16, 16, 0.11)',
  canvas: '#f6f6f3',
  paper: '#ffffff',
  yellow: '#ffc21c',
  softYellow: '#fff8de',
} as const;

export const adminSurfaceSx = {
  backgroundColor: ADMIN_COLORS.paper,
  border: `1px solid ${ADMIN_COLORS.border}`,
  borderRadius: 4,
  boxShadow: '0 12px 34px rgba(16, 16, 16, 0.055)',
} as const;

export const adminDataGridSx = {
  border: 0,
  color: ADMIN_COLORS.ink,
  '& .MuiDataGrid-toolbarContainer': {
    gap: 1,
    minHeight: 58,
    px: 2,
    py: 1.25,
    borderBottom: `1px solid ${ADMIN_COLORS.border}`,
    backgroundColor: '#fbfbf9',
  },
  '& .MuiDataGrid-columnHeaders': {
    backgroundColor: '#f7f7f4',
    borderBottom: `1px solid ${ADMIN_COLORS.border}`,
  },
  '& .MuiDataGrid-columnHeaderTitle': {
    color: '#555',
    fontSize: '0.74rem',
    fontWeight: 700,
    letterSpacing: '0.055em',
    textTransform: 'uppercase',
  },
  '& .MuiDataGrid-cell': {
    borderColor: 'rgba(16, 16, 16, 0.075)',
  },
  '& .MuiDataGrid-row': {
    transition: 'background-color 140ms ease',
  },
  '& .MuiDataGrid-row:hover': {
    backgroundColor: 'rgba(255, 194, 28, 0.075)',
  },
  '& .MuiDataGrid-footerContainer': {
    borderTop: `1px solid ${ADMIN_COLORS.border}`,
    backgroundColor: '#fbfbf9',
  },
  '& .MuiDataGrid-overlayWrapper': {
    minHeight: 220,
  },
} as const;
