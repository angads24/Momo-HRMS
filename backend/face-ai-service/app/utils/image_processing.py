import base64
import gc
import io
import cv2
import numpy as np
from PIL import Image

def decode_base64_image(image_base64: str, max_dim: int = 640) -> np.ndarray:
    """
    Decodes base64 string (with or without data:image/jpeg;base64, header)
    and resizes via PIL streaming before creating NumPy arrays to prevent
    high-resolution phone photos from spiking memory on 512MB cloud instances.
    """
    if "," in image_base64:
        image_base64 = image_base64.split(",", 1)[1]
    
    image_bytes = base64.b64decode(image_base64)
    image = Image.open(io.BytesIO(image_bytes))
    
    # Downsample high-res phone camera images directly in PIL (saves ~95% RAM)
    image.thumbnail((max_dim, max_dim), Image.Resampling.LANCZOS)
    image = image.convert("RGB")
    
    rgb_array = np.array(image)
    bgr_array = cv2.cvtColor(rgb_array, cv2.COLOR_RGB2BGR)
    
    del image_bytes
    del image
    del rgb_array
    gc.collect()
    
    return bgr_array

def resize_if_needed(image: np.ndarray, max_dim: int = 640) -> np.ndarray:
    """
    Downsamples the image proportionally if it exceeds max_dim.
    """
    h, w = image.shape[:2]
    if max(h, w) > max_dim:
        scale = max_dim / max(h, w)
        new_w, new_h = int(w * scale), int(h * scale)
        return cv2.resize(image, (new_w, new_h), interpolation=cv2.INTER_AREA)
    return image
