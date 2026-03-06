import { ref, watch, type Ref } from 'vue';
import _ from 'lodash';
import { DEBOUNCE_DELAY_DEFAULT } from '../enums/constants';

export function useDebounce(source: Ref<string>, delay: number = DEBOUNCE_DELAY_DEFAULT) {
  const debounced = ref(source.value);

  const update = _.debounce((val: string) => {
    debounced.value = val;
  }, delay);

  watch(source, (val) => {
    update(val);
  });

  return debounced;
}
