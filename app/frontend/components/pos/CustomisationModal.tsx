"use client";

import type React from "react";
import { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
  Box,
  Slider,
  Divider,
} from "@mui/material";
import { SketchPicker } from "react-color";
import type { Card } from "../../../backend/context/POSContext";

interface CustomizationModalProps {
  open: boolean;
  card: Card;
  onClose: () => void;
  onSave: (card: Card) => void;
  onDelete: () => void;
}

const CustomizationModal: React.FC<CustomizationModalProps> = ({
  open,
  card,
  onClose,
  onSave,
  onDelete,
}) => {
  const [editedCard, setEditedCard] = useState<Card>({ ...card });
  const [showBackgroundColorPicker, setShowBackgroundColorPicker] =
    useState(false);
  const [showFontColorPicker, setShowFontColorPicker] = useState(false);

  const handleWidthChange = (_event: Event, newValue: number | number[]) => {
    setEditedCard({ ...editedCard, width: newValue as number });
  };

  const handleHeightChange = (_event: Event, newValue: number | number[]) => {
    setEditedCard({ ...editedCard, height: newValue as number });
  };

  const handleFontSizeChange = (_event: Event, newValue: number | number[]) => {
    setEditedCard({ ...editedCard, fontSize: newValue as number });
  };

  const handleSave = () => {
    onSave(editedCard);
    onClose();
  };

  const handleCancel = () => {
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleCancel} maxWidth="sm" fullWidth>
      <DialogTitle>Customize Card</DialogTitle>
      <DialogContent>
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle1" gutterBottom>
            Display Text
          </Typography>
          <TextField
            fullWidth
            value={editedCard.productName || editedCard.name || editedCard.content || ""}
            onChange={(e) => {
              if (editedCard.productId) {
                setEditedCard({
                  ...editedCard,
                  productName: e.target.value,
                });
              } else {
                setEditedCard({ ...editedCard, name: e.target.value, content: e.target.value });
              }
            }}
            placeholder="Button Text"
          />
        </Box>

        <Divider sx={{ my: 2 }} />

        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle1" gutterBottom>
            Size
          </Typography>
          <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
            <Typography sx={{ minWidth: 80 }}>Width:</Typography>
            <Slider
              value={editedCard.width}
              onChange={handleWidthChange}
              min={50}
              max={400}
              step={10}
              valueLabelDisplay="auto"
            />
            <Typography sx={{ ml: 2, minWidth: 50 }}>
              {editedCard.width}px
            </Typography>
          </Box>
          <Box sx={{ display: "flex", alignItems: "center" }}>
            <Typography sx={{ minWidth: 80 }}>Height:</Typography>
            <Slider
              value={editedCard.height}
              onChange={handleHeightChange}
              min={50}
              max={300}
              step={10}
              valueLabelDisplay="auto"
            />
            <Typography sx={{ ml: 2, minWidth: 50 }}>
              {editedCard.height}px
            </Typography>
          </Box>
        </Box>

        <Divider sx={{ my: 2 }} />

        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle1" gutterBottom>
            Text
          </Typography>
          <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
            <Typography sx={{ minWidth: 80 }}>Font Size:</Typography>
            <Slider
              value={editedCard.fontSize}
              onChange={handleFontSizeChange}
              min={10}
              max={36}
              step={1}
              valueLabelDisplay="auto"
            />
            <Typography sx={{ ml: 2, minWidth: 50 }}>
              {editedCard.fontSize}px
            </Typography>
          </Box>

          <Box sx={{ mt: 2 }}>
            <Typography sx={{ mb: 1 }}>Text Color:</Typography>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
              }}
            >
              <Box
                onClick={() => setShowFontColorPicker(!showFontColorPicker)}
                sx={{
                  backgroundColor: editedCard.fontColor || "#000000",
                  width: 36,
                  height: 36,
                  borderRadius: "4px",
                  border: "1px solid #ccc",
                  cursor: "pointer",
                  mr: 2,
                }}
              />
              <Typography>{editedCard.fontColor || "#000000"}</Typography>
            </Box>
            {showFontColorPicker && (
              <Box sx={{ mt: 1, position: "relative", zIndex: 2 }}>
                <Box
                  sx={{
                    position: "fixed",
                    top: 0,
                    right: 0,
                    bottom: 0,
                    left: 0,
                  }}
                  onClick={() => setShowFontColorPicker(false)}
                />
                <SketchPicker
                  color={editedCard.fontColor || "#000000"}
                  onChange={(color) =>
                    setEditedCard({ ...editedCard, fontColor: color.hex })
                  }
                  disableAlpha
                />
              </Box>
            )}
          </Box>
        </Box>

        <Divider sx={{ my: 2 }} />

        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle1" gutterBottom>
            Background
          </Typography>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
            }}
          >
            <Box
              onClick={() =>
                setShowBackgroundColorPicker(!showBackgroundColorPicker)
              }
              sx={{
                backgroundColor: editedCard.cardColor || "#e0e0e0",
                width: 36,
                height: 36,
                borderRadius: "4px",
                border: "1px solid #ccc",
                cursor: "pointer",
                mr: 2,
              }}
            />
            <Typography>{editedCard.cardColor || "#e0e0e0"}</Typography>
          </Box>
          {showBackgroundColorPicker && (
            <Box sx={{ mt: 1, position: "relative", zIndex: 2 }}>
              <Box
                sx={{
                  position: "fixed",
                  top: 0,
                  right: 0,
                  bottom: 0,
                  left: 0,
                }}
                onClick={() => setShowBackgroundColorPicker(false)}
              />
              <SketchPicker
                color={editedCard.cardColor || "#e0e0e0"}
                onChange={(color) =>
                  setEditedCard({ ...editedCard, cardColor: color.hex })
                }
                disableAlpha
              />
            </Box>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onDelete} color="error" variant="outlined">
          Delete
        </Button>
        <Box sx={{ flex: 1 }} />
        <Button onClick={handleCancel}>Cancel</Button>
        <Button onClick={handleSave} variant="contained" color="primary">
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CustomizationModal;
