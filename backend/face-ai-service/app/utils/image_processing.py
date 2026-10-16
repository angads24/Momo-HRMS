import base64
import gc
import io
import cv2
import numpy as np
from PIL import Image

def decode_base64_image(image_base64: str, max_dim: int = 480) -> np.ndarray:
    """
    Decodes base64 string directly into a downsampled BGR OpenCV NumPy array.
    Applies PIL thumbnail resizing BEFORE converting to NumPy to prevent
    massive RAM allocation spikes on memory-constrained servers (e.g. Render 512MB).
    """
    if "," in image_base64:
        image_base64 = image_base64.split(",", 1)[1]
    
    image_bytes = base64.b64decode(image_base64)
    bio = io.BytesIO(image_bytes)
    with Image.open(bio) as pil_img:
        pil_img = pil_img.convert("RGB")
        # Proportionally scale down if either dimension exceeds max_dim
        if max(pil_img.size) > max_dim:
            resample_filter = getattr(Image.Resampling, "BILINEAR", Image.BILINEAR if hasattr(Image, "BILINEAR") else 2)
            pil_img.thumbnail((max_dim, max_dim), resample=resample_filter)
        rgb_array = np.array(pil_img)
    
    del image_bytes
    del bio
    
    bgr_array = cv2.cvtColor(rgb_array, cv2.COLOR_RGB2BGR)
    del rgb_array
    gc.collect()
    return bgr_array

def resize_if_needed(image: np.ndarray, max_dim: int = 480) -> np.ndarray:
    """
    Downsamples the image proportionally if it exceeds max_dim to keep
    inference lightweight and fast.
    """
    h, w = image.shape[:2]
    if max(h, w) > max_dim:
        scale = max_dim / max(h, w)
        new_w, new_h = int(w * scale), int(h * scale)
        return cv2.resize(image, (new_w, new_h), interpolation=cv2.INTER_AREA)
    return image
