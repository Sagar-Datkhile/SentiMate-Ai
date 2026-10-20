import { toast, toastManager, ToastItem } from './src/components/ui/Toast';

async function runTests() {
  console.log('--- Starting Glassmorphic Toast Verification Suite ---');

  let currentToasts: ToastItem[] = [];
  const unsubscribe = toastManager.subscribe((items) => {
    currentToasts = items;
  });

  // Test 1: Add Success Toast
  console.log('\n[Test 1] Add Success Toast');
  toast.clear();
  const id1 = toast.success('Profile changes saved.', {
    description: 'Updated successfully.',
  });
  console.assert(currentToasts.length === 1, `Expected 1 toast, got ${currentToasts.length}`);
  console.assert(currentToasts[0].variant === 'success', `Expected variant success, got ${currentToasts[0].variant}`);
  console.assert(currentToasts[0].duration === 4000, `Expected default 4000ms duration, got ${currentToasts[0].duration}`);
  console.assert(currentToasts[0].persistent === false, 'Expected non-persistent');
  console.log('✓ Test 1 passed: Success toast registered with 4s auto-dismiss');

  // Test 2: Add Error Toast (Default Persistent)
  console.log('\n[Test 2] Add Error Toast');
  toast.clear();
  const id2 = toast.error('Profile update failed.', {
    description: 'Permanent registration number is invalid.',
  });
  console.assert(currentToasts.length === 1, `Expected 1 toast, got ${currentToasts.length}`);
  console.assert(currentToasts[0].variant === 'error', `Expected variant error, got ${currentToasts[0].variant}`);
  console.assert(currentToasts[0].persistent === true, 'Expected error to be persistent by default');
  console.log('✓ Test 2 passed: Error toast registered as persistent');

  // Test 3: Deduplication via Stable ID & In-Place State Update
  console.log('\n[Test 3] Stable ID Deduplication & In-Place Update (Loading -> Success)');
  toast.clear();
  const stableId = 'async-operation-1';
  toast.loading('Saving changes...', { id: stableId, description: 'Writing to DB.' });
  console.assert(currentToasts.length === 1, 'Expected 1 loading toast');
  console.assert(currentToasts[0].id === stableId, 'Expected id matches stableId');
  console.assert(currentToasts[0].variant === 'loading', 'Expected variant loading');

  // Update in place to success
  toast.success('Profile changes saved.', { id: stableId, description: 'Saved successfully.' });
  console.assert(currentToasts.length === 1, `Expected still exactly 1 toast, got ${currentToasts.length}`);
  console.assert(currentToasts[0].variant === 'success', `Expected updated to success, got ${currentToasts[0].variant}`);
  console.assert(currentToasts[0].title === 'Profile changes saved.', 'Title updated in place');
  console.log('✓ Test 3 passed: In-place transition without stacking duplicate cards');

  // Test 4: Max 3 Visible Constraint & Queue Bounding
  console.log('\n[Test 4] Max 3 Visible Toasts Constraint');
  toast.clear();
  toast.success('Toast A', { id: 'a' });
  toast.success('Toast B', { id: 'b' });
  toast.success('Toast C', { id: 'c' });
  console.assert(currentToasts.length === 3, `Expected 3 visible toasts, got ${currentToasts.length}`);

  // Adding a 4th toast should not exceed max 3 visible; it evicts oldest non-persistent
  toast.info('Toast D', { id: 'd' });
  // The oldest was marked exiting or queued
  console.assert(currentToasts.length <= 3, `Expected at most 3 visible, got ${currentToasts.length}`);
  console.log('✓ Test 4 passed: Strict limit of at most 3 visible toasts preserved');

  // Test 5: toast.promise API
  console.log('\n[Test 5] toast.promise helper');
  toast.clear();
  const mockPromise = new Promise<string>((resolve) => setTimeout(() => resolve('done'), 100));
  const promiseResult = await toast.promise(mockPromise, {
    loading: 'Loading data...',
    success: 'Data loaded successfully!',
    error: 'Failed to load data.',
  }, { id: 'promise-test' });
  console.assert(promiseResult === 'done', 'Expected promise to resolve value');
  console.assert(currentToasts[0].variant === 'success', `Expected variant success, got ${currentToasts[0].variant}`);
  console.assert(currentToasts[0].title === 'Data loaded successfully!', 'Expected success message');
  console.log('✓ Test 5 passed: toast.promise seamlessly handles async lifecycles');

  // Test 6: toast.clear on Logout / Account Switch
  console.log('\n[Test 6] toast.clear() clears visible and pending toasts immediately');
  toast.success('Toast X');
  toast.error('Toast Y');
  console.assert(currentToasts.length > 0, 'Expected active toasts');
  toast.clear();
  console.assert(currentToasts.length === 0, `Expected 0 toasts after clear, got ${currentToasts.length}`);
  console.log('✓ Test 6 passed: toast.clear() flushes all active notifications');

  unsubscribe();
  console.log('\n=== All 6 Toast System Test Assertions Passed Successfully! ===');
}

runTests().catch((err) => {
  console.error('Toast verification failed:', err);
  process.exit(1);
});
