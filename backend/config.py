"""Runtime model configuration shared by backend services and routers."""

PRIMARY_MODEL_ID = "nvidia/nemotron-3-super-120b-a12b:free"
CRITIC_MODEL_ID = "poolside/laguna-s-2.1:free"
DEFAULT_EXECUTION_MODE = "fast"
EXECUTION_MODES = ("fast", "quality")
