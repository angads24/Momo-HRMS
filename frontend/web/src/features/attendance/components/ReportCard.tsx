import type { ReactNode } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';

export interface ReportCardProps {
  id: string;
  icon: ReactNode;
  title: string;
  description: string;
  onGenerate: () => void;
  active?: boolean;
}

export function ReportCard({
  icon,
  title,
  description,
  onGenerate,
  active = false,
}: ReportCardProps) {
  return (
    <Card
      variant="outlined"
      onClick={onGenerate}
      sx={{
        borderRadius: 2.5,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        cursor: 'pointer',
        borderWidth: active ? 2 : 1,
        borderColor: active ? 'primary.main' : 'divider',
        bgcolor: 'background.paper',
        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        '&:hover': {
          transform: 'translateY(-3px)',
          boxShadow: '0 10px 25px -5px rgba(27, 75, 143, 0.1), 0 8px 10px -6px rgba(27, 75, 143, 0.05)',
          borderColor: 'primary.main',
          '& .generate-btn': {
            transform: 'translateX(3px)',
          },
        },
      }}
    >
      <CardContent sx={{ p: 3, flex: 1, display: 'flex', flexDirection: 'column' }}>
        <Box
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 48,
            height: 48,
            borderRadius: 2.5,
            bgcolor: 'rgba(27, 75, 143, 0.08)',
            color: 'primary.main',
            mb: 2,
            fontSize: '1.5rem',
          }}
        >
          {icon}
        </Box>

        <Typography variant="h6" sx={{ fontSize: '1.05rem', fontWeight: 700, mb: 1, color: 'text.primary' }}>
          {title}
        </Typography>

        <Typography variant="body2" color="text.secondary" sx={{ mb: 2, flex: 1, lineHeight: 1.5 }}>
          {description}
        </Typography>

        <Box sx={{ pt: 1, mt: 'auto', display: 'flex', alignItems: 'center' }}>
          <Button
            variant="text"
            color="primary"
            size="small"
            className="generate-btn"
            endIcon={<ArrowForwardIcon fontSize="small" />}
            onClick={(e) => {
              e.stopPropagation();
              onGenerate();
            }}
            sx={{
              p: 0,
              minWidth: 0,
              fontWeight: 700,
              fontSize: '0.875rem',
              transition: 'transform 0.2s ease',
              '&:hover': {
                bgcolor: 'transparent',
                textDecoration: 'underline',
              },
            }}
          >
            Generate Report
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
}
