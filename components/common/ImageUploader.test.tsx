import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ImageUploader } from './ImageUploader';
import { imageStorage } from '../../services/imageStorage';

jest.mock('../../services/imageStorage', () => ({
  imageStorage: {
    uploadImage: jest.fn(),
    deleteImage: jest.fn(),
    getImageUrl: jest.fn().mockImplementation((id: string) => id.startsWith('img_') ? 'data:image/jpeg;base64,MOCKED' : id),
  },
}));

// Mock del modal de recorte para simular la confirmación del recorte
jest.mock('./ImageCropModal', () => ({
  __esModule: true,
  default: ({ onCropComplete }: { onCropComplete: (file: File) => void }) => {
    const fakeCroppedFile = new File(['cropped'], 'cropped.jpg', { type: 'image/jpeg' });
    // Simula que el usuario confirma el recorte inmediatamente
    React.useEffect(() => {
      onCropComplete(fakeCroppedFile);
    }, [onCropComplete]);
    return <div>ImageCropModal Mock</div>;
  },
}));

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

  it('sube archivo, recorta y muestra preview llamando onImageChange', async () => {
    (imageStorage.uploadImage as jest.Mock).mockResolvedValue({
      success: true,
      imageId: 'img_avatar_123',
      imageUrl: 'data:image/jpeg;base64,FAKE',
      finalSize: 1000,
    });

    setup();
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['data'], 'avatar.jpg', { type: 'image/jpeg' });

    // Simula la selección de archivo, que ahora abre el modal (mockeado)
    fireEvent.change(fileInput, { target: { files: [file] } });

    // El modal mockeado llama a onCropComplete, que a su vez llama a uploadImage
    await waitFor(() => {
      // Verificamos que el upload se llamó con el archivo "recortado" por el mock
      expect(imageStorage.uploadImage).toHaveBeenCalledWith(
        expect.any(File),
        'avatar',
        undefined
      );
      expect(onImageChange).toHaveBeenCalledWith('img_avatar_123');
      expect(screen.getByAltText('Avatar')).toBeInTheDocument();
    });
  });

  it('muestra error si upload falla después del recorte y llama onError', async () => {
    (imageStorage.uploadImage as jest.Mock).mockResolvedValue({
      success: false,
      imageId: '',
      imageUrl: '',
      error: 'Fallo al subir',
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

    const deleteBtn = screen.getByText(/Eliminar/i);
    fireEvent.click(deleteBtn);

    await waitFor(() => {
      expect(imageStorage.deleteImage).toHaveBeenCalledWith('img_avatar_123');
      expect(onImageChange).toHaveBeenCalledWith('');
    });
  });
});
