import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ImageUploader } from './ImageUploader';
import { imageStorage } from '../../services/imageStorage';

jest.mock('../../services/imageStorage', () => {
  return {
    imageStorage: {
      uploadImage: jest.fn(),
      deleteImage: jest.fn(),
      getImageUrl: jest.fn().mockImplementation((id: string) => id.startsWith('img_') ? 'data:image/jpeg;base64,MOCKED' : id)
    }
  };
});

describe('ImageUploader', () => {
  const onImageChange = jest.fn();
  const onError = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  function setup(props: Partial<React.ComponentProps<typeof ImageUploader>> = {}) {
    return render(
      <ImageUploader
        type="avatar"
        label="Avatar"
        onImageChange={onImageChange}
        onError={onError}
        {...props}
      />
    );
  }

  it('renderiza label y estado inicial sin preview', () => {
    setup();
    expect(screen.getByText('Avatar')).toBeInTheDocument();
    expect(screen.getByText(/Arrastra o haz clic/i)).toBeInTheDocument();
  });

  it('sube archivo y muestra preview llamando onImageChange', async () => {
    (imageStorage.uploadImage as jest.Mock).mockResolvedValue({
      success: true,
      imageId: 'img_avatar_123',
      imageUrl: 'data:image/jpeg;base64,FAKE',
      finalSize: 1000
    });

    setup();
    // El input está oculto y no tiene label asociado, lo buscamos directamente.
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;

    const file = new File(['data'], 'avatar.jpg', { type: 'image/jpeg' });
    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(imageStorage.uploadImage).toHaveBeenCalled();
      expect(onImageChange).toHaveBeenCalledWith('img_avatar_123');
      expect(screen.getByAltText('Avatar')).toBeInTheDocument();
    });
  });

  it('muestra error si upload falla y llama onError', async () => {
    (imageStorage.uploadImage as jest.Mock).mockResolvedValue({
      success: false,
      imageId: '',
      imageUrl: '',
      error: 'Fallo al subir'
    });

    setup();
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['data'], 'avatar.jpg', { type: 'image/jpeg' });
    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(onError).toHaveBeenCalledWith('Fallo al subir');
    });
  });

  it('elimina imagen al hacer click en botón ✕', async () => {
    setup({ currentImageUrl: 'img_avatar_123' });

    await waitFor(() => screen.getByAltText('Avatar'));

    const deleteBtn = screen.getByTitle(/Eliminar imagen/i);
    fireEvent.click(deleteBtn);

    await waitFor(() => {
      expect(imageStorage.deleteImage).toHaveBeenCalledWith('img_avatar_123');
      expect(onImageChange).toHaveBeenCalledWith('');
    });
  });
});
