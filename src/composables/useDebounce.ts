import { ref, watch, type Ref } from 'vue';

export function useDebounce(source: Ref<string>, delay: number = 400) {
  const debounced = ref(source.value);
  let timeout: ReturnType<typeof setTimeout>;

  watch(source, (val) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => {
      debounced.value = val;
    }, delay);
  });

  return debounced;
}
