import EntityPicker from './EntityPicker';
import Dialog from '../Dialog';

export default function EntityPickerModal({ open, title, onClose, ...pickerProps }) {
  if (!open) return null;

  return (
    <Dialog open={open} title={title} onClose={onClose}>
      <EntityPicker {...pickerProps} />
    </Dialog>
  );
}
