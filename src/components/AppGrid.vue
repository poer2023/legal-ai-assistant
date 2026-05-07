<script setup lang="ts">
import {
  BriefcaseBusiness,
  Car,
  FileText,
  HandCoins,
  Home
} from 'lucide-vue-next';

const emit = defineEmits<{
  'select-question': [question: string];
}>();

const exampleQuestions = [
  {
    id: 1,
    question: '劳动赔偿怎么算？',
    icon: BriefcaseBusiness
  },
  {
    id: 2,
    question: '借款利息上限？',
    icon: HandCoins
  },
  {
    id: 3,
    question: '租房押金能退吗？',
    icon: Home
  },
  {
    id: 4,
    question: '交通事故怎么赔？',
    icon: Car
  },
  {
    id: 5,
    question: '违约金能调低吗？',
    icon: FileText
  }
];

const exampleQuestionRows = [
  exampleQuestions.slice(0, 3),
  exampleQuestions.slice(3)
];

const handleQuestionClick = (question: string) => {
  emit('select-question', question);
};
</script>

<template>
  <div class="example-questions" aria-label="示例问题">
    <div v-for="(row, rowIndex) in exampleQuestionRows" :key="rowIndex" class="question-row">
      <button
        v-for="item in row"
        :key="item.id"
        class="question-chip"
        type="button"
        @click="handleQuestionClick(item.question)"
      >
        <component :is="item.icon" :size="21" class="question-icon" />
        <span>{{ item.question }}</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.example-questions {
  width: min(1080px, 100%);
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 18px;
}

.question-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 18px;
}

.question-chip {
  min-height: 48px;
  padding: 0 22px;
  border: 1px solid #e2e8f0;
  border-radius: 999px;
  background: #ffffff;
  color: #525a66;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  font-size: 16px;
  font-weight: 500;
  line-height: 1.2;
  text-align: center;
  white-space: nowrap;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.03);
  transition: border-color 0.18s ease, box-shadow 0.18s ease, color 0.18s ease, transform 0.18s ease;
}

.question-chip:hover {
  border-color: #bfdbfe;
  color: #1d4ed8;
  box-shadow: 0 8px 22px rgba(37, 99, 235, 0.1);
  transform: translateY(-1px);
}

.question-chip:focus-visible {
  outline: 2px solid #60a5fa;
  outline-offset: 3px;
}

.question-icon {
  flex-shrink: 0;
  color: #64748b;
}

.question-chip:hover .question-icon {
  color: #2563eb;
}

@media (max-width: 1180px) {
  .example-questions {
    width: min(700px, 100%);
    gap: 12px;
  }

  .question-row {
    gap: 12px;
  }

  .question-chip {
    min-width: 0;
  }
}

@media (max-width: 768px) {
  .example-questions {
    width: 100%;
    gap: 8px;
  }

  .question-row {
    width: 100%;
    flex-direction: column;
    gap: 8px;
  }

  .question-chip {
    width: 100%;
    justify-content: flex-start;
    min-height: 40px;
    padding: 0 14px;
    font-size: 14px;
    text-align: left;
    white-space: normal;
  }
}
</style>
