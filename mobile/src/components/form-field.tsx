import { Controller, type Control, type FieldPath, type FieldValues } from 'react-hook-form';
import type { TextInputProps } from 'react-native';

import { TextField } from './ui/text-field';

interface FormFieldProps<T extends FieldValues> extends Omit<TextInputProps, 'value' | 'onChangeText' | 'className'> {
  control: Control<T>;
  name: FieldPath<T>;
  label: string;
  password?: boolean;
}

/** TextField bound to react-hook-form; shows the field's validation error. */
export function FormField<T extends FieldValues>({ control, name, ...props }: FormFieldProps<T>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field: { onChange, onBlur, value, ref }, fieldState: { error } }) => (
        <TextField ref={ref} value={value ?? ''} onChangeText={onChange} onBlur={onBlur} error={error?.message} {...props} />
      )}
    />
  );
}
