export const PRIMARY_MODEL_ID = 'nvidia/nemotron-3-super-120b-a12b:free';
export const PRIMARY_MODEL_NAME = 'NVIDIA Nemotron 3 Super 120B';
export const CRITIC_MODEL_ID = 'poolside/laguna-s-2.1:free';
export const EXECUTION_MODES = {
  fast: {
    label: 'Fast mode',
    description: 'Prompt Builder → Nemotron',
  },
  quality: {
    label: 'Quality mode',
    description: 'Builder → Laguna → Refinement → Nemotron',
  },
};
